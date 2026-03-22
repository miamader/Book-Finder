package com.author.book_finder.series.service;

import com.author.book_finder.series.dto.BooksInSeriesDTO;
import com.author.book_finder.series.dto.SeriesCreateRequestDTO;
import com.author.book_finder.series.dto.SeriesDetailsDTO;
import com.author.book_finder.series.dto.SeriesResponseDTO;
import com.author.book_finder.series.entity.Series;
import com.author.book_finder.user.entity.User;
import com.author.book_finder.series.repository.SeriesRepository;
import com.author.book_finder.user.repository.UserRepository;
import com.author.book_finder.security.SecurityUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;


import java.util.List;


@Service
@Transactional
public class SeriesService {

    private final SeriesRepository seriesRepository;
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;

    public SeriesService(SeriesRepository seriesRepository, UserRepository userRepository, SecurityUtil securityUtil) {
        this.seriesRepository = seriesRepository;
        this.userRepository = userRepository;
        this.securityUtil = securityUtil;
    }

    // CREATE SERIES
    public SeriesResponseDTO createSeries(SeriesCreateRequestDTO seriesCreateRequestDTO) {

        Long userId = securityUtil.getCurrentUserId();

        User author = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Series series = new Series();
        series.setSeriesName(seriesCreateRequestDTO.getSeriesName());
        series.setDescription(seriesCreateRequestDTO.getDescription());
        series.setPublishDate(seriesCreateRequestDTO.getPublishDate());
        author.addSeries(series);

        Series savedSeries = seriesRepository.save(series);

        return mapToResponseDTO(savedSeries);
    }

    // GET ALL SERIES PUBLIC
    public Page<SeriesResponseDTO> getAllSeries(Pageable pageable) {
        return seriesRepository.findAll(pageable).map(this::mapToResponseDTO);
    }

    // GET MY SERIES
    public Page<SeriesResponseDTO> getMySeries(Pageable pageable) {

        Long userId = securityUtil.getCurrentUserId();

        return seriesRepository.findByUser_UserId(userId, pageable).map(this::mapToResponseDTO);
    }

    // GET SERIES DETAILS PUBLIC
    public SeriesDetailsDTO getSeriesDetails(Long seriesId) {

        Series series = seriesRepository.findById(seriesId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found"));

        return mapToDetailsDTO(series);
    }

    // UPDATE SERIES
    public SeriesResponseDTO updateSeries(Long seriesId, SeriesCreateRequestDTO seriesCreateRequestDTO) {
        Series series = seriesRepository.findById(seriesId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found"));

        validateOwnership(series);

        series.setSeriesName(seriesCreateRequestDTO.getSeriesName());
        series.setDescription(seriesCreateRequestDTO.getDescription());
        series.setPublishDate(seriesCreateRequestDTO.getPublishDate());

        Series updatedSeries = seriesRepository.save(series);

        return mapToResponseDTO(updatedSeries);
    }

    // DELETE SERIES
    public void deleteSeries(Long seriesId) {

        Series series = seriesRepository.findById(seriesId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Series not found"));

        validateOwnership(series);

        series.getUser().removeSeries(series);
    }

    // OWNERSHIP VALIDATION (ADMIN BYPASS)
    private void validateOwnership(Series series) {

        Long currentUserId = securityUtil.getCurrentUserId();
        boolean isAdmin = securityUtil.isAdmin();

        if (!series.getUser().getUserId().equals(currentUserId) && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to perform this action");
        }
    }

    // MAPPER
    private SeriesResponseDTO mapToResponseDTO(Series series) {

        int totalBooks = series.getBooks() != null ? series.getBooks().size() : 0;

        return new SeriesResponseDTO(
                series.getSeriesId(),
                series.getSeriesName(),
                series.getDescription(),
                series.getPublishDate(),
                series.getUser().getUsername(),
                totalBooks
        );
    }

    private SeriesDetailsDTO mapToDetailsDTO(Series series) {

        List<BooksInSeriesDTO> booksInSeries =
                series.getBooks() == null ? List.of() :
                        series.getBooks().stream()
                                .map(book -> new BooksInSeriesDTO(
                                        book.getBookId(),
                                        book.getVolumeNumber(),
                                        book.getTitle()
                                ))
                                .toList();

        return new SeriesDetailsDTO(
                series.getSeriesId(),
                series.getSeriesName(),
                series.getDescription(),
                series.getPublishDate(),
                series.getUser().getUsername(),
                booksInSeries.size(),
                booksInSeries
        );
    }
}
