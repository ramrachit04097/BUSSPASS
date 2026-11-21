# BUSPASS

## SRM University AP -- Bus Pass Registration & Management System

**BUSPASS** is a university transport management portal designed to
digitize student bus pass registration, application tracking,
administrative approvals, route management, and digital bus pass
generation at SRM University AP.

The project combines a React-based frontend with a backend implemented
in standard C (C99/C11). Core backend logic and permanent data storage
use C structures, functions, arrays, pointers, string handling, and
text-file I/O. The system does not use an SQL database.

------------------------------------------------------------------------

## 1. Project Overview

BUSPASS provides a centralized platform for students and university
transport administrators.

Students can: - Register using their university Student ID. - Log in
using their Student ID or registered email. - Apply for a university bus
pass. - Track application status. - View approved pass details. - Submit
renewal applications.

Administrators can: - View application and student information. -
Approve or reject bus pass applications. - Search and update
applications. - Add, update, and delete bus routes. - View transport
statistics and reports.

The project also includes an independent, menu-driven C console
application demonstrating basic bus pass management operations.

------------------------------------------------------------------------

## 2. Project Objectives

-   Digitize the university bus pass application process.
-   Reduce manual paperwork and simplify application tracking.
-   Provide administrators with a centralized approval and
    route-management system.
-   Demonstrate practical use of fundamental C programming concepts.
-   Implement persistent storage using standard C file-handling
    functions.
-   Connect a C backend to a modern web frontend through CGI and
    HTTP/JSON communication.

------------------------------------------------------------------------

## 3. Technology Stack

  Component            Technology
  -------------------- ----------------------------------------------
  Backend language     Standard C (C99/C11)
  Compiler             GCC
  Backend execution    CGI
  Web server           Apache CGI or configured HTTP-to-CGI gateway
  Frontend             React
  Styling              Tailwind CSS
  Frontend languages   HTML, CSS, JavaScript
  Data storage         Plain-text files
  Record format        Pipe-delimited text
  Communication        HTTP and JSON
  Development tools    Node.js and npm

**Architecture note:** React and JavaScript provide the user interface.
The C backend handles core application processing and persistent data
operations. A standard React development server does not execute C CGI
programs by itself; the development environment must include a
configured HTTP-to-CGI gateway or equivalent integration.

------------------------------------------------------------------------

## 4. Main Features

### 4.1 Student Portal

-   Student registration using a university Student ID.
-   Login using Student ID or registered email.
-   New bus pass application submission.
-   Application status tracking.
-   Viewing approved bus pass details.
-   Digital bus pass display with QR-code support.
-   Bus pass renewal requests.

### 4.2 Administrator Portal

-   Administrator authentication.
-   Dashboard with application statistics.
-   Student and application viewing.
-   Application search and filtering.
-   Application approval and rejection.
-   Application detail updates.
-   Bus route creation, editing, and deletion.
-   Route-wise application statistics and reports.

### 4.3 Backend Functionality

-   Unique application ID generation.
-   Duplicate Student ID and email validation.
-   Duplicate pending application prevention.
-   Application status management.
-   File-based persistent storage.
-   Temporary-file-based record updates.
-   CGI request handling and JSON responses.
-   Graceful handling of missing or empty data files.

------------------------------------------------------------------------

## 5. System Architecture

BUSPASS uses a three-file C source architecture.

``` text
                    BUSPASS APPLICATION
                            |
              +-------------+-------------+
              |                           |
          FRONTEND                     BACKEND
              |                           |
       React + Tailwind               Standard C
              |                           |
        HTML / CSS / JS               CGI Program
              |                           |
              +------- HTTP / JSON -------+
                                          |
                               +----------+----------+
                               |                     |
                         C Functions             File Storage
                               |                     |
                       Authentication           students.txt
                       Pass Management          buspass.txt
                       Route Management         routes.txt
                       Admin Reports            routes.txt
                                                 admin.txt
```

### 5.1 Three C Source Files

  -----------------------------------------------------------------------
  File                                Responsibility
  ----------------------------------- -----------------------------------
  `backend/buspass.h`                 Structure definitions and function
                                      prototypes

  `backend/buspass.c`                 CGI backend, request handling,
                                      authentication, pass and route
                                      management, and reports

  `console/buspass_console.c`         Independent menu-driven C console
                                      application
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 6. Project Directory Structure

``` text
BUSPASS/
|
|-- backend/
|   |-- buspass.h
|   |-- buspass.c
|
|-- console/
|   |-- buspass_console.c
|
|-- data/
|   |-- students.txt
|   |-- buspass.txt
|   |-- routes.txt
|   |-- admin.txt
|
|-- cgi-bin/
|   |-- buspass.cgi
|
|-- public/
|
|-- src/
|   |-- components/
|   |-- pages/
|   |-- assets/
|   |-- ...
|
|-- Makefile
|-- package.json
|-- package-lock.json
|-- apache-buspass.conf
|-- README.md
```

*Note: Frontend folder names may differ depending on the actual React
project structure. The compiled CGI binary is generated during the build
process.*

------------------------------------------------------------------------

## 7. C Structures

The central bus pass record is represented using a C structure.

``` c
struct BusPass {
    int applicationID;
    char studentID[24];
    char name[50];
    char department[30];
    char contact[15];
    char email[50];
    char route[30];
    char boardingPoint[50];
    char passType[20];
    char validity[20];
    char status[20];
};
```

Additional structures include:

-   `struct Student` -- stores student ID, name, department, email,
    contact number, and password.
-   `struct BusRoute` -- stores route number, start location, end
    location, boarding points, and route status.
-   `struct Admin` -- stores administrator username, password, and full
    name.

------------------------------------------------------------------------

## 8. Core C Functions

  -----------------------------------------------------------------------
  Function                            Purpose
  ----------------------------------- -----------------------------------
  `registerStudent()`                 Validates and registers a new
                                      student

  `loginStudent()`                    Authenticates a student using ID or
                                      email and password

  `loginAdmin()`                      Authenticates an administrator

  `addPass()`                         Creates a new bus pass application

  `displayPass()`                     Retrieves applications filtered by
                                      student or status

  `searchPass()`                      Searches by application ID, Student
                                      ID, name, or route

  `updatePass()`                      Updates application details

  `approvePass()`                     Changes an application status to
                                      Approved

  `rejectPass()`                      Changes an application status to
                                      Rejected

  `renewPass()`                       Creates a new pending renewal
                                      application

  `addRoute()`                        Adds a new bus route

  `displayRoutes()`                   Displays available routes

  `updateRoute()`                     Updates route information

  `deleteRoute()`                     Deletes a route

  `generatePass()`                    Retrieves approved pass details for
                                      digital display

  `getAdminReport()`                  Calculates student, application,
                                      status, and route statistics
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 9. Data Storage and File Handling

The application uses plain-text files stored in the `data/` directory.
Records are stored in a pipe-delimited format (`|`).

  File                  Purpose
  --------------------- --------------------------------
  `data/students.txt`   Registered student accounts
  `data/buspass.txt`    Bus pass applications
  `data/routes.txt`     Bus routes and boarding points
  `data/admin.txt`      Administrator credentials

The backend uses standard C file-handling functions:

-   `fopen()` -- opens a file for reading, writing, or appending.
-   `fgets()` -- reads records from a file.
-   `fprintf()` -- writes records to a file.
-   `fclose()` -- closes an opened file.
-   `remove()` -- removes a file.
-   `rename()` -- renames a temporary file.

For record updates and deletions, the program writes the updated records
to a temporary file before replacing the original file.

**Storage limitation:** Plain-text storage is suitable for demonstrating
file handling in an academic project, but it is not a substitute for a
secure production database. Concurrent writes, file locking, backup,
recovery, and data validation must be addressed before real-world
deployment.

------------------------------------------------------------------------

## 10. Application Workflow

1.  **Public homepage:** Introduces BUSPASS and provides access to
    student registration and login.
2.  **Student registration:** A student creates an account using their
    university details.
3.  **Student login:** The backend verifies the submitted credentials.
4.  **Pass application:** The student selects a route, boarding point,
    pass type, and validity.
5.  **Application submission:** The backend assigns an application ID
    and stores the application with `Pending` status.
6.  **Administrative review:** An administrator reviews the submitted
    application.
7.  **Approval or rejection:** The administrator updates the application
    status.
8.  **Digital pass:** An approved application becomes available for
    digital pass display.
9.  **Renewal:** A student can submit a new renewal application for an
    approved pass.

------------------------------------------------------------------------

## 11. Installation and Setup

### 11.1 Prerequisites

Install the following tools:

-   GCC compiler
-   Node.js
-   npm
-   Git
-   Apache with CGI support, if using Apache deployment

### 11.2 Clone the Repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd BUSPASS
```

Replace `<YOUR_REPOSITORY_URL>` with the actual repository address.

### 11.3 Install Frontend Dependencies

``` bash
npm install
```

### 11.4 Compile the C CGI Backend

Using the Makefile:

``` bash
make
```

Alternatively, compile manually:

``` bash
gcc -Wall -Wextra -O2 backend/buspass.c -o cgi-bin/buspass.cgi
```

### 11.5 Compile the Console Application

``` bash
gcc -Wall -Wextra -O2 console/buspass_console.c -o console/buspass_console
```

------------------------------------------------------------------------

## 12. Running the Application

BUSPASS supports the following execution methods.

### Option A: Development Environment

Install dependencies and start the configured development environment:

``` bash
npm install
npm run dev
```

Open the local address displayed by the development server. The supplied
project configuration may use:

``` text
http://localhost:3000
```

The C backend must be connected through the configured HTTP-to-CGI
gateway. Running the React development server alone is not sufficient to
execute the C backend.

### Option B: Apache CGI Deployment

1.  Compile the C backend.
2.  Build the frontend:

``` bash
npm run build
```

3.  Copy the generated `dist/` contents into the Apache DocumentRoot.
4.  Place `buspass.cgi` in the configured CGI directory.
5.  Configure the backend to access the `data/` directory.
6.  Enable Apache CGI support (`mod_cgi`).
7.  Configure the CGI endpoint and appropriate file permissions.
8.  Restart Apache.

Refer to `apache-buspass.conf` for the project's deployment
configuration.

### Option C: Standalone Console Application

Run the compiled console application:

``` bash
./console/buspass_console
```

On Windows, run the generated executable from the terminal using its
filename, for example:

``` powershell
.\console\buspass_console.exe
```

------------------------------------------------------------------------

## 13. Login Information

### Student Account

No sample student accounts are preloaded. Students must register through
the application.

Example Student ID:

``` text
AP1111111111
```

### Administrator Account

Default development credentials:

  Field      Value
  ---------- ------------
  Username   `admin`
  Password   `admin123`

**Security warning:** These are demonstration credentials only. Change
them before deployment. Production systems should use secure password
hashing, session management, role-based access controls, and HTTPS.
Plain-text password storage must not be used for real student or
administrator accounts.

------------------------------------------------------------------------

## 14. Console Application

The project includes an independent C console program to demonstrate
basic bus pass management through a menu-driven interface.

### Available Operations

1.  Register New Bus Pass
2.  Display All Applications
3.  Search Application by Student ID
4.  Update Bus Pass Details
5.  Exit

### Sample Output

``` text
============================================
       BUS PASS REGISTRATION SYSTEM
============================================

1. Register New Bus Pass
2. Display All Applications
3. Search Application by Student ID
4. Update Bus Pass Details
5. Exit

--------------------------------------------
Enter your choice (1-5): 3

--- Search Application by Student ID ---

Enter Student ID to search: AP1111111111

Record Found:

Application ID : 1001
Student ID     : AP1111111111
Name           : Student Name
Department     : Computer Science
Route          : R-101
Boarding Point : Main Gate
Pass Type      : Semester
Validity       : 2026-12-31
Status         : Approved
```

The displayed record is an illustrative sample, not a preloaded account.

------------------------------------------------------------------------

## 15. C Programming Concepts Demonstrated

The project demonstrates the following concepts:

-   Structures (`struct`)
-   User-defined functions
-   Arrays
-   Pointers
-   String handling
-   Conditional statements
-   Loops and iterations
-   File handling
-   Header files and modular programming
-   Data validation
-   Record searching and updating
-   Temporary-file-based record operations
-   CGI request and response handling

------------------------------------------------------------------------

## 16. Security and Implementation Considerations

The current design is intended for academic demonstration. Before real
university deployment, the following improvements are necessary:

-   Store passwords using a suitable password-hashing algorithm.
-   Replace default administrator credentials.
-   Implement secure session management.
-   Validate and sanitize all user input.
-   Restrict access to administrative functions.
-   Use HTTPS for network communication.
-   Add file locking or another synchronization mechanism for concurrent
    file access.
-   Implement reliable backup and recovery for stored records.
-   Ensure that QR codes contain verifiable identifiers and are checked
    by a backend verification endpoint.

A QR code image by itself does not prove that a bus pass is valid.
Authenticity depends on server-side verification.

------------------------------------------------------------------------

## 17. Future Scope

Possible future enhancements include:

-   Integration with the university's student verification system.
-   Real-time university bus tracking.
-   Online bus pass fee payment.
-   QR-based boarding verification.
-   Email and SMS application notifications.
-   Route capacity management.
-   Automated pass expiration reminders.
-   Advanced transport analytics.
-   Dedicated mobile application.

------------------------------------------------------------------------

## 18. Academic Project Summary

  Particular               Details
  ------------------------ ----------------------------------------
  Project Name             BUSPASS
  Institution              SRM University AP
  Project Category         University Transport Management System
  Backend Language         Standard C (C99/C11)
  Frontend                 React and Tailwind CSS
  Data Storage             Pipe-delimited text files
  Backend Architecture     CGI
  Database                 No SQL database
  Additional Application   Menu-driven C console program

### Conclusion

BUSPASS demonstrates how fundamental C programming concepts can be
applied to a practical university transport management problem. It
combines a modern web interface with a C-based backend and file-based
persistent storage to support student registration, bus pass
applications, administrative approvals, route management, and digital
pass access.

The project provides practical exposure to structured programming, file
handling, backend processing, data management, and frontend-backend
integration.

------------------------------------------------------------------------

**BUSPASS --- University Transport Management System**\
*Developed as an academic project for SRM University AP.*
