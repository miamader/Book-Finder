package com.author.book_finder.book.repository;

import com.author.book_finder.book.entity.Book;
import com.author.book_finder.user.entity.User;
import com.author.book_finder.series.entity.Series;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends
        JpaRepository<Book, Long>,
        JpaSpecificationExecutor<Book> {

    // Series Volume Logic
    @Query("""
        SELECT COALESCE(MAX(b.volumeNumber), 0)
        FROM Book b
        WHERE b.series.seriesId = :seriesId
    """)
    Integer findMaxVolumeBySeriesId(@Param("seriesId") Long seriesId);

    boolean existsBySeries_SeriesIdAndVolumeNumber(Long seriesId, int volumeNumber);

    boolean existsBySeries_SeriesIdAndVolumeNumberAndBookIdNot(
            Long seriesId,
            int volumeNumber,
            Long currentBookId
    );

    // Regular Queries
    List<Book> findByUser(User user);

    List<Book> findBySeries(Series series);

    List<Book> findByTitleContainingIgnoreCase(String title);

    List<Book> findBySeriesOrderByVolumeNumberAsc(Series series);

    // Specification Search Optimization
    @EntityGraph(attributePaths = {"user", "series"})
    Page<Book> findAll(Specification<Book> spec, Pageable pageable);

    // PostgreSQL Full Text Search
    @Query(value = """
                SELECT *,
                    ts_rank(
                         setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
                        setweight(to_tsvector('english', coalesce(summary,'')), 'B'),
                        websearch_to_tsquery('english', :keyword)
                    ) AS rank
                FROM books
                WHERE
                    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
                    setweight(to_tsvector('english', coalesce(summary,'')), 'B')
                    @@ websearch_to_tsquery('english', :keyword)
                ORDER BY rank DESC
            """,

            countQuery = """
                            SELECT count(*)
                            FROM books
                            WHERE
                                setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
                                setweight(to_tsvector('english', coalesce(summary,'')), 'B')
                                @@ websearch_to_tsquery('english', :keyword)
                    """,
            nativeQuery = true)
    Page<Book> fullTextSearch(
            @Param("keyword") String keyword,
            Pageable pageable
    );
}


