package com.author.book_finder.book.specification;

import com.author.book_finder.book.entity.Book;
import com.author.book_finder.genre.entity.Genre;
import com.author.book_finder.hashtag.entity.Hashtag;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class BookSpecifications {

    public static Specification<Book> keywordSearch(String keyword) {

        return (root, query, cb) -> {

            if (keyword == null || keyword.isBlank()) {
                return null;
            }

            String pattern = "%" + keyword.toLowerCase() + "%";

            return cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("summary")), pattern)
            );
        };
    }

    public static Specification<Book> hasGenres(List<String> genres) {

        return (root, query, cb) -> {

            if (genres == null || genres.isEmpty()) {
                return null;
            }

            query.distinct(true);

            Join<Book, Genre> genreJoin = root.join("genres", JoinType.LEFT);

            return genreJoin.get("genreName").in(genres);
        };
    }

    public static Specification<Book> hasHashtags(List<String> hashtags) {

        return (root, query, cb) -> {

            if (hashtags == null || hashtags.isEmpty()) {
                return null;
            }

            query.distinct(true);

            Join<Book, Hashtag> hashtagJoin = root.join("hashtags", JoinType.LEFT);

            return hashtagJoin.get("hashtag").in(hashtags);
        };
    }

    public static Specification<Book> belongsToSeries(Long seriesId) {

        return (root, query, cb) -> {

            if (seriesId == null) {
                return null;
            }

            return cb.equal(root.get("series").get("seriesId"), seriesId);
        };
    }

    public static Specification<Book> belongsToUser(Long userId) {

        return (root, query, cb) -> {

            if (userId == null) {
                return null;
            }

            return cb.equal(root.get("user").get("userId"), userId);
        };
    }
}