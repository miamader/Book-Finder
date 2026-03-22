package com.author.book_finder.review.controller;

import com.author.book_finder.review.dto.ReviewCreateRequestDTO;
import com.author.book_finder.review.dto.ReviewResponseDTO;
import com.author.book_finder.review.dto.ReviewUpdateRequestDTO;
import com.author.book_finder.review.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/books/{bookId}/reviews")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ReviewResponseDTO> createReview(
            @PathVariable Long bookId,
            @Valid @RequestBody ReviewCreateRequestDTO dto
    ) {
        ReviewResponseDTO response = reviewService.createReview(bookId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/books/{bookId}/reviews")
    public ResponseEntity<Page<ReviewResponseDTO>> getReviewsForBook(
            @PathVariable Long bookId,
            Pageable pageable
    ) {
        Page<ReviewResponseDTO> reviews = reviewService.getReviewsForBook(bookId, pageable);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/books/{bookId}/reviews/me")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ReviewResponseDTO> getMyReviewForBook(
            @PathVariable Long bookId
    ) {
        ReviewResponseDTO response = reviewService.getMyReviewForBook(bookId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/reviews/{reviewId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ReviewResponseDTO> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewUpdateRequestDTO dto
    ) {
        ReviewResponseDTO response = reviewService.updateReview(reviewId, dto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/reviews/{reviewId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long reviewId
    ) {
        reviewService.deleteReview(reviewId);
        return ResponseEntity.noContent().build();
    }
}