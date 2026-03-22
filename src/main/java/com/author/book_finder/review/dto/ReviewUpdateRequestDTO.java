package com.author.book_finder.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public class ReviewUpdateRequestDTO {

    @Min(1)
    @Max(5)
    private Integer rating;

    private String comment;

    public ReviewUpdateRequestDTO() {
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}