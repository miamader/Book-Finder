package com.author.book_finder.series.dto;

import java.time.LocalDate;
import java.util.List;

public class SeriesDetailsDTO {

    private Long seriesId;
    private String seriesName;
    private String seriesDescription;
    private LocalDate publishDate;

    private String authorUsername;
    private int totalBooks;
    private List<BooksInSeriesDTO> booksInSeries;

    public SeriesDetailsDTO(Long seriesId,
                            String seriesName,
                            String seriesDescription,
                            LocalDate publishDate,
                            String authorUsername,
                            int totalBooks,
                            List<BooksInSeriesDTO> booksInSeries) {
        this.seriesId = seriesId;
        this.seriesName = seriesName;
        this.seriesDescription = seriesDescription;
        this.publishDate = publishDate;
        this.authorUsername = authorUsername;
        this.totalBooks = totalBooks;
        this.booksInSeries = booksInSeries;
    }

    public Long getSeriesId() {
        return seriesId;
    }

    public void setSeriesId(Long seriesId) {
        this.seriesId = seriesId;
    }

    public String getSeriesName() {
        return seriesName;
    }

    public void setSeriesName(String seriesName) {
        this.seriesName = seriesName;
    }

    public String getSeriesDescription() {
        return seriesDescription;
    }

    public void setSeriesDescription(String seriesDescription) {
        this.seriesDescription = seriesDescription;
    }

    public LocalDate getPublishDate() {
        return publishDate;
    }

    public void setPublishDate(LocalDate publishDate) {
        this.publishDate = publishDate;
    }

    public String getAuthorUsername() {
        return authorUsername;
    }

    public void setAuthorUsername(String authorUsername) {
        this.authorUsername = authorUsername;
    }

    public int getTotalBooks() {
        return totalBooks;
    }

    public void setTotalBooks(int totalBooks) {
        this.totalBooks = totalBooks;
    }

    public List<BooksInSeriesDTO> getBooksInSeries() {
        return booksInSeries;
    }

    public void setBooksInSeries(List<BooksInSeriesDTO> booksInSeries) {
        this.booksInSeries = booksInSeries;
    }
}
