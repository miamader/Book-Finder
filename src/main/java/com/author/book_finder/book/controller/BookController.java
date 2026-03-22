package com.author.book_finder.book.controller;

import com.author.book_finder.book.dto.BookCreateRequestDTO;
import com.author.book_finder.book.dto.BookDetailsDTO;
import com.author.book_finder.book.dto.BookResponseDTO;
import com.author.book_finder.book.dto.BookUpdateRequestDTO;
import com.author.book_finder.book.service.BookService;
import com.author.book_finder.search.dto.SearchRequestDTO;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    // CREATE BOOK
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<BookResponseDTO> createBook(
           @Valid @RequestBody BookCreateRequestDTO dto
    ) {
        return ResponseEntity.ok(bookService.createBook(dto));
    }

    // GET ALL BOOKS PUBLIC
    @GetMapping
    public ResponseEntity<Page<BookResponseDTO>> getAllBooks(Pageable pageable) {
        return ResponseEntity.ok(bookService.getAllBooks(pageable));
    }

    // GET BOOK DETAILS PUBLIC
    @GetMapping("/{id}")
    public ResponseEntity<BookDetailsDTO> getBookDetails(@PathVariable Long id) {
        return ResponseEntity.ok(bookService.getBookDetails(id));
    }

    // UPDATE BOOK
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<BookResponseDTO> updateBook(
            @PathVariable Long id,
            @Valid @RequestBody BookUpdateRequestDTO dto
    ) {
        return ResponseEntity.ok(bookService.updateBook(id, dto));
    }

    // DELETE BOOK
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {

        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();

    }

    // SEARCH FEATURE
    @PostMapping("/search")
    public Page<BookResponseDTO> searchBooks(
            @RequestBody SearchRequestDTO request) {

        return bookService.searchBooks(request);
    }
}