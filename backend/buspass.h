#ifndef BUSPASS_H
#define BUSPASS_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_RECORDS 500
#define MAX_PARAMS 32
#define MAX_PATH_LEN 256

/* Main BusPass structure (supports alphanumeric Student IDs like AP1111111111) */
struct BusPass
{
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

/* Student account structure */
struct Student
{
    char studentID[24];
    char fullName[50];
    char department[30];
    char email[50];
    char contact[15];
    char password[32];
};

/* Bus Route structure */
struct BusRoute
{
    char routeNumber[20];
    char startLocation[50];
    char endLocation[50];
    char boardingPoints[120];
    char status[20];
};

/* Admin account structure */
struct Admin
{
    char username[30];
    char password[32];
    char fullName[50];
};

/* CGI key-value pair structure */
struct KeyValue
{
    char key[64];
    char value[256];
};

/* Core C CGI backend functions (implemented in backend/buspass.c) */
void registerStudent(struct KeyValue params[], int paramCount);
void loginStudent(struct KeyValue params[], int paramCount);
void listStudents(struct KeyValue params[], int paramCount);
void addPass(struct KeyValue params[], int paramCount);
void displayPass(struct KeyValue params[], int paramCount);
void searchPass(struct KeyValue params[], int paramCount);
void updatePass(struct KeyValue params[], int paramCount);
void approvePass(struct KeyValue params[], int paramCount);
void rejectPass(struct KeyValue params[], int paramCount);
void renewPass(struct KeyValue params[], int paramCount);
void addRoute(struct KeyValue params[], int paramCount);
void displayRoutes(void);
void updateRoute(struct KeyValue params[], int paramCount);
void deleteRoute(struct KeyValue params[], int paramCount);
void generatePass(struct KeyValue params[], int paramCount);
void loginAdmin(struct KeyValue params[], int paramCount);
void getAdminReport(void);

#endif
