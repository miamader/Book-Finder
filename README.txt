================================================================================
README.txt
BookFinder – CS (Computer Science)
FIU Senior Capstone II – Spring 2026
================================================================================

PROJECT OVERVIEW
----------------
BookFinder is a full-stack web platform where independent authors can publish
their books for free, and readers can discover and read them for free. Makes the ability to read and publish books accessible to all. Guest users may preview one chapter of any book without an account. Registered users gain full reading access, the ability to write reviews, and the ability to publish their own books and series.

Live Website: https://miamader.github.io/Book-Finder/

TEAM MEMBERS
------------
- Zachary Shea – Product Owner, Team Lead
- Christopher Vivas – Backend Developer
- David Martinez – Backend Developer
- Mia Mader – Frontend Developer
- Mariah Harris – Frontend Developer

INSTRUCTOR & MENTOR: Dr. Masoud Sadjadi

TECH STACK
----------
Frontend : HTML, CSS, JavaScript (hosted via GitHub Pages)
Backend  : Java, Spring Boot, Maven (hosted via Railway)
Database : PostgreSQL (originally AWS RDS)
Storage  : AWS S3 (chapter text and book cover storage)
Auth     : JWT (JSON Web Tokens)
Local Dev: Docker / Docker Compose

================================================================================
DIRECTORY STRUCTURE (CODE DIRECTORY)
================================================================================

Code/
│
├── README.txt  
│
├── Frontend/                         ← Frontend repository (GitHub Pages)
│   ├── .github/
│   │   └── workflows/                ← GitHub Actions for Pages deployment
│   ├── components/
│   │   └── navbar.js                 ← Reusable navigation bar component
│   ├── js/                           ← JavaScript files for page functionality
│   │   ├── index.js
│   │   ├── login.js
│   │   ├── signup.js
│   │   ├── dashboard.js
│   │   ├── search.js
│   │   ├── bookview.js
│   │   ├── chapter-reader.js
│   │   ├── createbook.js
│   │   ├── createseries.js
│   │   ├── managebooks.js
│   │   ├── manageseries.js
│   │   ├── writebook.js
│   │   └── profile.js
│   ├── styles/                       ← CSS stylesheets for each page
│   ├── svg_files/                    ← SVG assets (logo, icons, etc.)
│   ├── index.html                    ← Home/landing page
│   ├── login.html                    ← Login page
│   ├── signup.html                   ← Sign up / Registration page
│   ├── dashboard.html                ← User dashboard
│   ├── search.html                   ← Book/author search results page
│   ├── bookview.html                 ← Individual book detail page
│   ├── chapter-reader.html           ← Chapter reading page
│   ├── createbook.html               ← Book creation form
│   ├── createseries.html             ← Series creation form
│   ├── managebooks.html              ← Author's book management page
│   ├── manageseries.html             ← Author's series management page
│   ├── writebook.html                ← Chapter writing/editing interface
│   ├── profile.html                  ← User profile page
│   ├── about.html                    ← About page
│   ├── privacy.html                  ← Privacy policy page
│   └── terms.html                    ← Terms of service page
│
│
├── Backend/                          ← Backend repository (Spring Boot / Railway)
│   ├── .mvn/wrapper/                 
│   ├── src/main/
│   │   ├── java/com/author/book_finder/
│   │   │   ├── auth/                 ← Authentication (login, signup, JWT issue)
│   │   │   ├── book/                 ← Book entity, CRUD, cover management
│   │   │   ├── chapter/              ← Chapter creation, editing
│   │   │   ├── enums/                
│   │   │   │   ├── FileType.java
│   │   │   │   ├── PublicationStatus.java  ← DRAFT / PUBLISHED
│   │   │   │   └── ReadingStatus.java      ← CURRENTLY_READING / FINISHED / WANT_TO_READ
│   │   │   ├── exception/            ← Global error handling (ErrorResponse,
│   │   │   │                            GlobalExceptionHandler)
│   │   │   ├── genre/                ← Genre assignment per book
│   │   │   ├── hashtag/              ← Hashtag tagging system for books
│   │   │   ├── infrastructure/
│   │   │   │   ├── aws/              ← AWS S3 configuration and file ops
│   │   │   │   └── seed/             ← Demo data seeder 
│   │   │   ├── readingprogress/      ← Tracks per-user chapter reading progress
│   │   │   ├── review/               ← Book reviews (1 review per user per book)
│   │   │   ├── search/               ← Search by title, author, genre, hashtag
│   │   │   │   └── dto/              ← Search data transfer objects
│   │   │   ├── security/             ← JWT filter, security config, user details
│   │   │   │   ├── JwtAuthFilter.java
│   │   │   │   ├── JwtUtils.java
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── SecurityUtil.java
│   │   │   │   ├── UserDetailsImpl.java
│   │   │   │   └── UserDetailsServiceImpl.java
│   │   │   ├── series/               ← Series creation and book-to-series linking
│   │   │   ├── user/                 ← User accounts, profiles, authored books
│   │   │   └── BookFinderApplication.java  ← Spring Boot entry point
│   │   └── resources/                ← application.properties
│   ├── docker-compose.yml            ← Docker config for local development
│   ├── pom.xml                       ← Maven dependencies and build config
│   ├── mvnw                          ← Maven wrapper (Unix)
│   └── mvnw.cmd                      ← Maven wrapper (Windows)
│
├── Installation Guide/
│   └── InstallationGuide.pdf         ← Step-by-step setup instructions
│
└── User Manual/
    └── UserManual.pdf                ← How to use BookFinder, screenshots included

================================================================================
SUBFOLDER DESCRIPTIONS
================================================================================

--- FRONTEND ---

components/
  Contains reusable JavaScript components shared across pages. Currently holds
  navbar.js, which dynamically renders the top navigation bar on every page,
  avoiding repetition across HTML files.

js/
  Contains one JavaScript file per page. Each file handles the functionality
  for its corresponding HTML page, such as fetching data from the backend API,
  handling form submissions, and updating the DOM.

styles/
  Contains CSS stylesheets. Each HTML page has a corresponding stylesheet
  controlling its visuals.

svg_files/
  Contains SVG image assets used across the site, including the BookFinder
  logo and placeholder images for book covers.

.github/workflows/
  GitHub Actions configuration that automatically deploys the frontend to
  GitHub Pages whenever changes are pushed to the main branch.

--- BACKEND ---

auth/
  Handles user authentication flow including sign up, login, and issuing
  JWT tokens upon successful authentication.

book/
  Manages all book-related operations: creating books, setting/updating book
  covers, retrieving book details, and publishing books.

chapter/
  Handles chapter creation, editing, and storage. Chapter text content is
  stored in AWS S3 and retrieved on demand for the reader view.

enums/
  Defines shared enumeration types used across the application:
  - FileType.java: categorizes file types stored in S3
  - PublicationStatus.java: indicates whether a book is DRAFT or PUBLISHED
  - ReadingStatus.java: tracks whether a user is reading, finished, or has
   marked the book was 'want to read'

exception/
  Provides centralized error handling. GlobalExceptionHandler catches
  application-wide exceptions and returns structured error responses via
  ErrorResponse.java.

genre/
  Manages the assignment of genres (e.g., Fantasy, Romance, Historical) to
  books, enabling genre-based browsing and filtering.

hashtag/
  Implements a social-media-style hashtag system, allowing authors to tag
  their books with discoverable labels (e.g., #neoncityfiles, #contemporaryfiction, etc).

infrastructure/aws/
  Contains configuration and service classes for interacting with AWS S3,
  used for storing chapter text and book cover images.

infrastructure/seed/
  Contains a data seeder that populates the database with demo books and
  users for testing purposes.

readingprogress/
  Tracks each user's reading progress on a per-chapter basis, allowing the
  platform to resume where a reader left off and display reading status.

review/
  Allows authenticated users to submit one written review per book, including a
  star rating. Manages review retrieval and display on book pages.

search/
  Handles all search functionality including searching by book title, author
  name, genre, and hashtags. The dto/ subfolder contains data transfer objects
  used to structure search query parameters and results.

security/
  Implements Spring Security configuration and JWT-based stateless
  authentication. Key files include:
  - JwtAuthFilter.java: intercepts requests and validates JWT tokens
  - JwtUtils.java: generates and parses JWT tokens
  - SecurityConfig.java: defines public vs. protected API routes
  - UserDetailsImpl / UserDetailsServiceImpl: bridges Spring Security
    with the application's user data

series/
  Handles series creation and management. A book can be standalone (its own
  single-book series) or part of a named multi-book series with an ordered
  list of entries.

user/
  Manages user accounts, profile information, and the relationship between
  users and the books they have authored.

================================================================================
HOW TO ACCESS THE LIVE WEBSITE (END USERS)
================================================================================

No installation is required for end users.

1. Navigate to: https://miamader.github.io/Book-Finder/
2. Click "Sign Up" to create a free account.
3. Once registered and logged in, you can:
   - Browse and read books and chapters
   - Search for books by title, author, genre, or hashtag
   - Write and submit reviews on books
   - Create your own books, chapters, and series
   - Manage your published and draft books
   - Edit your author profile

Guest users (not logged in) may preview one chapter of any book before
being prompted to sign in.

See the User Manual for a full walkthrough with screenshots.

================================================================================
FOR TECHNICAL SETUP (DEVELOPERS)
================================================================================

See the Installation Guide for full step-by-step instructions, including:
  - Prerequisites (Java 17+, Maven, Docker, Node, AWS credentials)
  - Cloning both repositories
  - Configuring environment variables (JWT secret, DB URL, AWS keys)
  - Running the backend locally with Docker Compose
  - Running the frontend locally or via GitHub Pages

================================================================================
CURRENT FEATURES
================================================================================
  - User registration and login (JWT-secured)
  - Book creation with cover image, genre, and hashtag support
  - Chapter creation and writing interface
  - Series creation (standalone or multi-book)
  - Book publishing workflow (Draft → Published)
  - Chapter reader with guest preview (1 chapter limit)
  - Book search by title, author, genre, and hashtag
  - User reviews (1 per user per book)
  - Author profile editing
  - Book and series management dashboard

================================================================================
FUTURE IMPLEMENTATIONS
================================================================================
  - Paid chapter locking (authors can monetize later chapters)
  - Community forums for book discussion
  - Downloadable book files after purchase
  - User reading lists and book organization
  - Profile display of favorite books and currently reading status
  - (more to be added)

================================================================================
REPOSITORIES
================================================================================
Frontend : https://github.com/miamader/Book-Finder
Backend  : https://github.com/Dante54321/Book-Finder

================================================================================
