package com.author.book_finder.review.mapper;

import com.author.book_finder.review.dto.ReviewResponseDTO;
import com.author.book_finder.review.entity.Review;
import org.springframework.stereotype.Component;

@Component
public class ReviewMapper {

    public ReviewResponseDTO toResponseDTO(Review review) {
        if (review == null) {
            return null;
        }

        ReviewResponseDTO dto = new ReviewResponseDTO();
        dto.setReviewId(review.getReviewId());
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());

        if (review.getBook() != null) {
            dto.setBookId(review.getBook().getBookId());
        }

        if (review.getUser() != null) {
            dto.setUserId(review.getUser().getUserId());
            dto.setUsername(review.getUser().getUsername());
        }

        return dto;
    }
}