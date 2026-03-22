package com.author.book_finder.review.repository;

import com.author.book_finder.book.entity.Book;
import com.author.book_finder.review.entity.Review;
import com.author.book_finder.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByUser(User user);

    Optional<Review> findByUserAndBook(User user, Book book);

    boolean existsByUserAndBook(User user, Book book);

    Page<Review> findByBook(Book book, Pageable pageable);

    long countByBook(Book book);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.book = :book")
    Double findAverageRatingByBook(@Param("book") Book book);
}