package com.author.book_finder.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public class ReviewCreateRequestDTO {

    @Min(1)
    @Max(5)
    private int rating;

    private String comment;

    public ReviewCreateRequestDTO() {
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}