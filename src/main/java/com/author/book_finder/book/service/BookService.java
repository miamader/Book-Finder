package com.author.book_finder.book.service;

import com.author.book_finder.book.dto.BookUpdateRequestDTO;
import com.author.book_finder.book.exception.BookAccessDeniedException;
import com.author.book_finder.book.exception.BookNotFoundException;
import com.author.book_finder.book.mapper.BookMapper;
import com.author.book_finder.book.repository.BookRepository;
import com.author.book_finder.book.dto.BookCreateRequestDTO;
import com.author.book_finder.book.dto.BookDetailsDTO;
import com.author.book_finder.book.dto.BookResponseDTO;
import com.author.book_finder.book.specification.BookSpecifications;
import com.author.book_finder.chapter.entity.Chapter;
import com.author.book_finder.book.entity.Book;
import com.author.book_finder.genre.entity.Genre;
import com.author.book_finder.genre.repository.GenreRepository;
import com.author.book_finder.hashtag.entity.Hashtag;
import com.author.book_finder.hashtag.repository.HashtagRepository;
import com.author.book_finder.search.dto.SearchRequestDTO;
import com.author.book_finder.security.SecurityUtil;
import com.author.book_finder.series.entity.Series;
import com.author.book_finder.series.repository.SeriesRepository;
import com.author.book_finder.infrastructure.aws.S3Service;
import com.author.book_finder.user.entity.User;
import com.author.book_finder.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;


@Service
@Transactional
public class BookService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final SeriesRepository seriesRepository;
    private final GenreRepository genreRepository;
    private final HashtagRepository hashtagRepository;
    private final SecurityUtil securityUtil;
    private final BookMapper bookMapper;
    private final S3Service s3Service;

    public BookService(BookRepository bookRepository,
                       UserRepository userRepository,
                       SeriesRepository seriesRepository,
                       GenreRepository genreRepository,
                       HashtagRepository hashtagRepository,
                       SecurityUtil securityUtil,
                       BookMapper bookMapper,
                       S3Service s3Service) {
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.seriesRepository = seriesRepository;
        this.genreRepository = genreRepository;
        this.hashtagRepository = hashtagRepository;
        this.securityUtil = securityUtil;
        this.bookMapper = bookMapper;
        this.s3Service = s3Service;
    }


    // CREATE BOOK
    public BookResponseDTO createBook(BookCreateRequestDTO dto) {

        Long userId = securityUtil.getCurrentUserId();

        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        Book book = new Book();
        book.setTitle(dto.getTitle());
        book.setSummary(dto.getSummary());
        book.setPublishDate(dto.getPublishDate());
        author.addBook(book);

        attachSeries(book, dto.getSeriesId());
        attachGenres(book, dto.getGenreIds());
        attachHashtags(book, dto.getHashtags());

        Book saved = bookRepository.save(book);

        return bookMapper.toResponseDTO(saved);
    }

    // GET ALL (PAGINATED)
    public Page<BookResponseDTO> getAllBooks(Pageable pageable) {
        return bookRepository.findAll(pageable)
                .map(bookMapper::toResponseDTO);
    }


    // GET DETAILS
    public BookDetailsDTO getBookDetails(Long bookId) {

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() ->
                        new BookNotFoundException(bookId));

        return bookMapper.toDetailsDTO(book);
    }


    // UPDATE BOOK
    public BookResponseDTO updateBook(Long id, BookUpdateRequestDTO dto) {

        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new BookNotFoundException(id));

        validateOwnership(book);

        // Partial updates
        if (dto.getTitle() != null) {
            book.setTitle(dto.getTitle());
        }

        if (dto.getSummary() != null) {
            book.setSummary(dto.getSummary());
        }

        if (dto.getPublishDate() != null) {
            book.setPublishDate(dto.getPublishDate());
        }

        if (dto.getSeriesId() != null) {
            attachSeries(book, dto.getSeriesId());
        }

        if (dto.getGenreIds() != null) {
            if (dto.getGenreIds().isEmpty()) {
                throw new IllegalArgumentException("Book must have at least one genre");
            }
            attachGenres(book, dto.getGenreIds());
        }

        if (dto.getHashtags() != null) {
            attachHashtags(book, dto.getHashtags());
        }

        Book updated = bookRepository.save(book);

        return bookMapper.toResponseDTO(updated);
    }


    // DELETE BOOK
    public void deleteBook(Long bookId) {

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new BookNotFoundException(bookId));

        validateOwnership(book);

        // Delete chapter files from S3
        for (Chapter chapter : book.getChapters()) {
            if (chapter.getS3Key() != null && !chapter.getS3Key().isBlank()) {
                s3Service.deleteObject(chapter.getS3Key());
            }
        }

        Series series = book.getSeries();

        // Remove book from user
        book.getUser().removeBook(book);

        // Renumber series AFTER removal
        if (series != null) {
            renumberVolumesInSeries(series);
        }
    }

    // SEARCH FEATURE
    public Page<BookResponseDTO> searchBooks(SearchRequestDTO request) {

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize()
        );

        Specification<Book> spec = Specification.allOf();

        spec = spec.and(BookSpecifications.keywordSearch(request.getKeyword()));

        spec = spec.and(BookSpecifications.hasGenres(request.getGenres()));

        spec = spec.and(BookSpecifications.hasHashtags(request.getHashtags()));

        spec = spec.and(BookSpecifications.belongsToSeries(request.getSeriesId()));

        spec = spec.and(BookSpecifications.belongsToUser(request.getUserId()));

        Page<Book> books = bookRepository.findAll(spec, pageable);

        return books.map(bookMapper::toResponseDTO);
    }

    // HELPER METHODS
    private void attachSeries(Book book, Long seriesId) {

        // Removing series (standalone book)
        if (seriesId == null) {

            Series oldSeries = book.getSeries();

            if (oldSeries != null) {
                oldSeries.removeBook(book);
                book.setVolumeNumber(null);
                renumberVolumesInSeries(oldSeries);
            }

            return;
        }

        Series series = seriesRepository.findById(seriesId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found")
                );

        // OWNERSHIP VALIDATION
        Long currentUserId = securityUtil.getCurrentUserId();
        if (!series.getUser().getUserId().equals(currentUserId)
                && !securityUtil.isAdmin()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot add a book to another user's series"
            );
        }

        // If already in same series do nothing
        if (book.getSeries() != null &&
                book.getSeries().getSeriesId().equals(seriesId)) {
            return;
        }

        Series oldSeries = book.getSeries();

        // If switching series remove from old one
        if (oldSeries != null) {
            oldSeries.removeBook(book);
            renumberVolumesInSeries(oldSeries);
        }

        // Attach Series to Book
        book.setVolumeNumber(null);

        series.addBook(book);

        renumberVolumesInSeries(series);

    }


    private void attachGenres(Book book, Set<Long> genreIds) {

        if (genreIds == null || genreIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "At least one genre is required");
        }

        Set<Genre> genres = genreIds.stream()
                .map(id -> genreRepository.findById(id)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Genre not found with id: " + id)))
                .collect(Collectors.toSet());

        book.replaceGenres(genres);
    }

    private void attachHashtags(Book book, Set<String> hashtags) {

        if (hashtags == null) {
            return;
        }

        Set<String> normalized = hashtags.stream()
                .filter(Objects::nonNull)
                .map(tag -> tag.trim().toLowerCase())
                .filter(tag -> !tag.isBlank())
                .collect(Collectors.toSet());

        Set<Hashtag> resolved = new HashSet<>();

        for (String name : normalized) {
            Hashtag hashtag = hashtagRepository
                    .findByHashtag(name)
                    .orElseGet(() -> hashtagRepository.save(new Hashtag(name)));

            resolved.add(hashtag);
        }

        book.replaceHashtags(resolved);
    }

    private void renumberVolumesInSeries(Series series) {
        List<Book> books = bookRepository.findBySeriesOrderByVolumeNumberAsc(series);

        for (Book b : books) {
            if (b.getVolumeNumber() != null) {
                b.setVolumeNumber(b.getVolumeNumber() + 1000);
            }
        }

        int volume = 1;
        for (Book b : books) {
            b.setVolumeNumber(volume++);
        }
    }

    // VALIDATE OWNERSHIP (ADMIN BYPASS)
    private void validateOwnership(Book book) {

        Long currentUserId = securityUtil.getCurrentUserId();
        boolean isAdmin = securityUtil.isAdmin();

        if (!book.getUser().getUserId().equals(currentUserId) && !isAdmin) {
            throw new BookAccessDeniedException();
        }
    }

}