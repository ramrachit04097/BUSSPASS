================================================================================
BUSPASS — SRM UNIVERSITY AP BUS PASS REGISTRATION & MANAGEMENT SYSTEM
================================================================================

1. PROJECT OBJECTIVE
--------------------
BUSPASS is a college-level university transport management portal for SRM
UNIVERSITY AP designed to digitize student bus pass registration, application
tracking, digital pass generation, route management, and administrative
approval. All core backend logic and permanent data storage are implemented
exclusively in standard C using structures, functions, arrays, pointers,
string handling, and text-file I/O.

2. TECHNOLOGIES USED
--------------------
- Backend Engine   : Standard C (C99/C11), compiled with GCC into a CGI binary
- Gateway / Server : Apache CGI (mod_cgi) or lightweight HTTP-to-CGI gateway
- Storage          : Plain text pipe-delimited files (data/*.txt) — No SQL
- Frontend         : HTML, CSS, JavaScript (React + Tailwind compiled to static assets)
- Console Program  : Independent menu-driven C console application

3. 3-FILE C ARCHITECTURE
------------------------
All C source code is consolidated into exactly 3 files:
1. backend/buspass.h        : Core C structures and function prototypes
2. backend/buspass.c        : Complete CGI backend (routing, URL decoding,
                              JSON output, student auth, admin auth, pass CRUD,
                              approvals, renewals, route CRUD, and live reports)
3. console/buspass_console.c: Standalone menu-driven C assignment program

Data storage (plain text files in data/):
- data/students.txt : Registered student accounts (starts empty; register with
                      your Student ID such as AP1111111111)
- data/buspass.txt  : Submitted bus pass applications (starts empty)
- data/routes.txt   : Campus shuttle routes and boarding points
- data/admin.txt    : Administrator credentials

4. STRUCTURE DEFINITIONS (backend/buspass.h)
--------------------------------------------
struct BusPass {
    int applicationID;
    char studentID[24];   /* Supports alphanumeric IDs like AP1111111111 */
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

Additional structures:
- struct Student  : Stores studentID, fullName, department, email, contact, password
- struct BusRoute : Stores routeNumber, startLocation, endLocation, boardingPoints, status
- struct Admin    : Stores username, password, fullName

5. C FUNCTIONS & THEIR PURPOSES
-------------------------------
- registerStudent() : Validates fields, rejects duplicate Student IDs/emails, appends to students.txt
- loginStudent()    : Matches Student ID (case-insensitive) or email + password from students.txt
- loginAdmin()      : Verifies admin username and password against admin.txt
- addPass()         : Generates unique applicationID, checks duplicate pending pass, saves Pending record
- displayPass()     : Reads buspass.txt and returns applications filtered by student/status
- searchPass()      : Searches applications by Application ID, Student ID, name, or route
- updatePass()      : Edits pass fields and writes safely via temporary file + remove/rename
- approvePass()     : Sets application status to Approved permanently
- rejectPass()      : Sets application status to Rejected permanently
- renewPass()       : Creates a new Pending renewal application from an Approved pass
- addRoute()        : Adds a new campus bus route to routes.txt (rejects duplicates)
- displayRoutes()   : Lists all routes from routes.txt
- updateRoute()     : Updates route details safely via temp file
- deleteRoute()     : Removes a route via temp file
- generatePass()    : Retrieves active Approved pass details for digital pass & QR rendering
- getAdminReport()  : Computes live student counts, status totals, and route-wise counts

6. FILE HANDLING IMPLEMENTATION
-------------------------------
All persistence uses standard C <stdio.h> functions:
- fopen("r" / "a" / "w"), fgets(), fprintf(), fclose()
- Safe updates and deletions write to a temporary file (e.g., data/buspass.tmp),
  close it, remove() the original file, and rename() the temporary file.
- Missing or empty files are handled gracefully without crashing.

7. APPLICATION WORKFLOW
-----------------------
1. Public Home Page introduces the SRM UNIVERSITY AP Bus Pass Registration &
   Management System with direct Login and Apply for Bus Pass access.
2. Students register an account with their Student ID (e.g., AP1111111111)
   and sign in to the Student Dashboard.
3. Students apply for a bus pass (saved to data/buspass.txt with status Pending).
4. Administrators sign in, inspect metrics computed from data/buspass.txt, and
   Approve or Reject applications, manage routes, view students, and inspect reports.
5. Once Approved, the student's Digital Bus Pass with QR verification becomes active.

8. COMPILATION INSTRUCTIONS
---------------------------
To compile both the C CGI backend and the independent C console program:

    make

Or compile manually with GCC:

    gcc -Wall -Wextra -O2 backend/buspass.c -o cgi-bin/buspass.cgi
    gcc -Wall -Wextra -O2 console/buspass_console.c -o console/buspass_console

9. HOW TO RUN THE APPLICATION
-----------------------------
Option A (Built-in HTTP-to-CGI Dev/Prod Gateway):
    npm install
    npm run dev
    Open http://localhost:3000 in your browser.

Option B (Apache CGI):
    npm run build
    Copy dist/* to Apache DocumentRoot, copy cgi-bin/buspass.cgi to /usr/lib/cgi-bin/,
    copy data/ alongside it, and enable mod_cgi (see apache-buspass.conf).

Option C (Independent C Console Program):
    ./console/buspass_console

10. LOGIN ACCESS
----------------
Student Account:
  No sample student accounts are preloaded. Students register directly using
  their university Student ID (e.g., AP1111111111).

Administrator Account:
  Username   : admin
  Password   : admin123

11. CONSOLE PROGRAM SAMPLE INPUT / OUTPUT
-----------------------------------------
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
================================================================================
