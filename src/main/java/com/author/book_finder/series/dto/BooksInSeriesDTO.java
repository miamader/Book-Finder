package com.author.book_finder.series.dto;

public class BooksInSeriesDTO {

    private Long bookId;
    private Integer volumeNumber;
    private String title;

    public BooksInSeriesDTO(Long bookId,Integer volumeNumber, String title) {
        this.bookId = bookId;
        this.volumeNumber = volumeNumber;
        this.title = title;
    }

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }

    public Integer getVolumeNumber() {
        return volumeNumber;
    }

    public void setVolumeNumber(Integer volumeNumber) {
        this.volumeNumber = volumeNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}

