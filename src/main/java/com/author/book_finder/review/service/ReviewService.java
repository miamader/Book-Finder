package com.author.book_finder.review.service;

import com.author.book_finder.book.entity.Book;
import com.author.book_finder.book.repository.BookRepository;
import com.author.book_finder.review.dto.ReviewCreateRequestDTO;
import com.author.book_finder.review.dto.ReviewResponseDTO;
import com.author.book_finder.review.dto.ReviewSummaryDTO;
import com.author.book_finder.review.dto.ReviewUpdateRequestDTO;
import com.author.book_finder.review.entity.Review;
import com.author.book_finder.review.mapper.ReviewMapper;
import com.author.book_finder.review.repository.ReviewRepository;
import com.author.book_finder.user.entity.User;
import com.author.book_finder.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final ReviewMapper reviewMapper;

    public ReviewService(
            ReviewRepository reviewRepository,
            BookRepository bookRepository,
            UserRepository userRepository,
            ReviewMapper reviewMapper
    ) {
        this.reviewRepository = reviewRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.reviewMapper = reviewMapper;
    }

    public ReviewResponseDTO createReview(Long bookId, ReviewCreateRequestDTO dto) {
        User currentUser = getCurrentUser();

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        if (reviewRepository.existsByUserAndBook(currentUser, book)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You already reviewed this book");
        }

        Review review = new Review();
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        review.setUser(currentUser);
        review.setBook(book);

        Review savedReview = reviewRepository.save(review);

        return reviewMapper.toResponseDTO(savedReview);
    }

    public ReviewResponseDTO updateReview(Long reviewId, ReviewUpdateRequestDTO dto) {
        User currentUser = getCurrentUser();

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (!review.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update your own review");
        }

        if (dto.getRating() != null) {
            review.setRating(dto.getRating());
        }

        if (dto.getComment() != null) {
            review.setComment(dto.getComment());
        }

        Review updatedReview = reviewRepository.save(review);

        return reviewMapper.toResponseDTO(updatedReview);
    }

    public void deleteReview(Long reviewId) {
        User currentUser = getCurrentUser();

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        if (!review.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own review");
        }

        reviewRepository.delete(review);
    }

    public Page<ReviewResponseDTO> getReviewsForBook(Long bookId, Pageable pageable) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        Page<Review> reviewPage = reviewRepository.findByBook(book, pageable);

        return reviewPage.map(reviewMapper::toResponseDTO);
    }

    public ReviewResponseDTO getMyReviewForBook(Long bookId) {
        User currentUser = getCurrentUser();

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        Review review = reviewRepository.findByUserAndBook(currentUser, book)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));

        return reviewMapper.toResponseDTO(review);
    }

    public ReviewSummaryDTO getReviewSummaryForBook(Long bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"));

        long totalReviews = reviewRepository.countByBook(book);
        Double averageRating = reviewRepository.findAverageRatingByBook(book);

        ReviewSummaryDTO summaryDTO = new ReviewSummaryDTO();
        summaryDTO.setTotalReviews(totalReviews);
        summaryDTO.setAverageRating(averageRating != null ? averageRating : 0.0);

        return summaryDTO;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        String username = authentication.getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}