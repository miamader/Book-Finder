-- Books indexes
CREATE INDEX idx_books_user_id
    ON books(user_id);

-- Book genres
CREATE INDEX idx_book_genres_genre_id
    ON book_genres(genre_id);

CREATE INDEX idx_book_genres_book_id
    ON book_genres(book_id);

-- Book hashtags
CREATE INDEX idx_book_hashtags_hashtag_id
    ON book_hashtags(hashtag_id);

CREATE INDEX idx_book_hashtags_book_id
    ON book_hashtags(book_id);

-- Reviews
CREATE INDEX idx_reviews_book_id
    ON reviews(book_id);

-- Series
CREATE INDEX idx_series_user_id
    ON series(user_id);

-- Full text search for books
CREATE INDEX idx_books_search
    ON books
    USING GIN (to_tsvector('english', title || ' ' || summary));