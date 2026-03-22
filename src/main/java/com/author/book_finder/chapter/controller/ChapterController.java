package com.author.book_finder.chapter.controller;

import com.author.book_finder.chapter.dto.*;
import com.author.book_finder.chapter.enums.ContentType;
import com.author.book_finder.chapter.service.ChapterService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api")
public class ChapterController {

    private final ChapterService chapterService;

    public ChapterController(ChapterService chapterService) {
        this.chapterService = chapterService;
    }

    // GET PREVIEW CHAPTER URL
    @GetMapping("/chapters/{id}/preview")
    public ResponseEntity<ChapterResponseDTO> getPreviewUrl(@PathVariable Long id) {
        return ResponseEntity.ok(chapterService.getPreviewUrl(id));
    }

    // GET URL FOR FULL CHAPTER LIST
    @GetMapping("/chapters/{id}")
    public ResponseEntity<ChapterResponseDTO> getFullUrl(@PathVariable Long id) {
        return ResponseEntity.ok(chapterService.getFullUrl(id));
    }

    // LIST CHAPTERS FOR BOOK PUBLIC
    @GetMapping("/book/{bookId}/chapters")
    public ResponseEntity<Page<ChapterResponseDTO>> listChapters(
            @PathVariable Long bookId,
            Pageable pageable){

        return ResponseEntity.ok(chapterService.listChaptersForBook(bookId, pageable));
    }

    // UPDATE CHAPTER
    @PatchMapping("/chapters/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ChapterResponseDTO> updateChapter(
            @PathVariable Long id,
            @RequestBody ChapterUpdateDTO request) {

        return ResponseEntity.ok(chapterService.updateChapter(id, request));
    }

    // DELETE CHAPTER
    @DeleteMapping("/chapters/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> deleteChapter(@PathVariable Long id) {
        chapterService.deleteChapter(id);
        return ResponseEntity.noContent().build();
    }

    //GENERATE UPLOAD URL
    @PostMapping("/books/{bookId}/chapters/upload-url")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<PresignedUploadResponseDTO> generateUploadUrl(
            @PathVariable Long bookId,
            @RequestParam String filename,
            @RequestParam ContentType contentType) {

        PresignedUploadResponseDTO responseDTO =
                chapterService.generateUploadUrl(
                        bookId,
                        filename,
                        contentType
                );

        return ResponseEntity.ok(responseDTO);

    }

    // CONFIRM UPLOAD & SAVE CHAPTER METADATA
    @PostMapping("/books/{bookId}/chapters/confirm")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ChapterUploadResponseDTO> confirmUpload(
            @PathVariable Long bookId,
            @RequestBody ChapterConfirmUploadDTO requestDTO) {

        ChapterUploadResponseDTO responseDTO =
                chapterService.confirmUpload(
                        bookId,
                        requestDTO
                );

        return ResponseEntity.status(HttpStatus.CREATED).body(responseDTO);
    }
}