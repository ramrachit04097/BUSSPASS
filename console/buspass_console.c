/*
 * BUSPASS - Independent C Console Program
 * Satisfies first-year C programming assignment requirements:
 * - Structures (struct BusPass)
 * - Functions
 * - File handling (fopen, fprintf, fgets, fclose, remove, rename)
 * - Menu-driven interface with 4 core operations + Exit
 * - Basic input validation and error handling
 *
 * Uses the same pipe-delimited format and data/buspass.txt file as the web portal.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_APPS 500
#define DATA_FILE "data/buspass.txt"
#define ALT_DATA_FILE "../data/buspass.txt"
#define TEMP_FILE "data/buspass_temp.txt"
#define ALT_TEMP_FILE "../data/buspass_temp.txt"

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

static int equalsIgnoreCase(const char *a, const char *b)
{
    size_t i = 0;
    while (a[i] != '\0' && b[i] != '\0')
    {
        if (tolower((unsigned char)a[i]) != tolower((unsigned char)b[i])) return 0;
        i++;
    }
    return a[i] == '\0' && b[i] == '\0';
}

void getBusPassFilePaths(char *dataPath, char *tempPath, size_t maxLen)
{
    FILE *fp = fopen(DATA_FILE, "r");
    if (fp != NULL)
    {
        fclose(fp);
        snprintf(dataPath, maxLen, "%s", DATA_FILE);
        snprintf(tempPath, maxLen, "%s", TEMP_FILE);
        return;
    }

    fp = fopen(ALT_DATA_FILE, "r");
    if (fp != NULL)
    {
        fclose(fp);
        snprintf(dataPath, maxLen, "%s", ALT_DATA_FILE);
        snprintf(tempPath, maxLen, "%s", ALT_TEMP_FILE);
        return;
    }

    snprintf(dataPath, maxLen, "%s", DATA_FILE);
    snprintf(tempPath, maxLen, "%s", TEMP_FILE);
}

void trimNewline(char *str)
{
    size_t len = strlen(str);
    while (len > 0 && (str[len - 1] == '\n' || str[len - 1] == '\r'))
    {
        str[len - 1] = '\0';
        len--;
    }
}

void readLine(const char *prompt, char *buffer, size_t size)
{
    size_t i;
    printf("%s", prompt);
    if (fgets(buffer, (int)size, stdin) == NULL)
    {
        buffer[0] = '\0';
        return;
    }
    trimNewline(buffer);
    for (i = 0; buffer[i] != '\0'; i++)
    {
        if (buffer[i] == '|') buffer[i] = ' ';
    }
}

int readInt(const char *prompt)
{
    char line[64];
    int value = 0;
    printf("%s", prompt);
    if (fgets(line, sizeof(line), stdin) == NULL) return -1;
    if (sscanf(line, "%d", &value) != 1) return -1;
    return value;
}

int loadApplications(struct BusPass list[], int maxCount)
{
    char dataPath[128], tempPath[128];
    FILE *fp;
    char line[512];
    int count = 0;

    getBusPassFilePaths(dataPath, tempPath, sizeof(dataPath));
    fp = fopen(dataPath, "r");
    if (fp == NULL) return 0;

    while (fgets(line, sizeof(line), fp) != NULL && count < maxCount)
    {
        char *fields[11];
        int fCount = 0;
        char *start = line;
        char *p = line;

        trimNewline(line);
        if (strlen(line) == 0) continue;

        while (*p != '\0' && fCount < 10)
        {
            if (*p == '|')
            {
                *p = '\0';
                fields[fCount++] = start;
                start = p + 1;
            }
            p++;
        }
        fields[fCount++] = start;

        if (fCount == 11)
        {
            list[count].applicationID = atoi(fields[0]);
            snprintf(list[count].studentID, sizeof(list[count].studentID), "%s", fields[1]);
            snprintf(list[count].name, sizeof(list[count].name), "%s", fields[2]);
            snprintf(list[count].department, sizeof(list[count].department), "%s", fields[3]);
            snprintf(list[count].contact, sizeof(list[count].contact), "%s", fields[4]);
            snprintf(list[count].email, sizeof(list[count].email), "%s", fields[5]);
            snprintf(list[count].route, sizeof(list[count].route), "%s", fields[6]);
            snprintf(list[count].boardingPoint, sizeof(list[count].boardingPoint), "%s", fields[7]);
            snprintf(list[count].passType, sizeof(list[count].passType), "%s", fields[8]);
            snprintf(list[count].validity, sizeof(list[count].validity), "%s", fields[9]);
            snprintf(list[count].status, sizeof(list[count].status), "%s", fields[10]);
            count++;
        }
    }

    fclose(fp);
    return count;
}

int saveApplications(struct BusPass list[], int count)
{
    char dataPath[128], tempPath[128];
    FILE *fp;
    int i;

    getBusPassFilePaths(dataPath, tempPath, sizeof(dataPath));
    fp = fopen(tempPath, "w");
    if (fp == NULL)
    {
        printf("[Error] Cannot create temporary file for saving.\n");
        return 0;
    }

    for (i = 0; i < count; i++)
    {
        fprintf(fp, "%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n",
                list[i].applicationID,
                list[i].studentID,
                list[i].name,
                list[i].department,
                list[i].contact,
                list[i].email,
                list[i].route,
                list[i].boardingPoint,
                list[i].passType,
                list[i].validity,
                list[i].status);
    }

    fclose(fp);
    remove(dataPath);
    if (rename(tempPath, dataPath) != 0)
    {
        printf("[Error] Failed to update bus pass records file.\n");
        return 0;
    }
    return 1;
}

void registerBusPass(void)
{
    struct BusPass list[MAX_APPS];
    struct BusPass pass;
    int count, nextAppId = 1001, i;
    char dataPath[128], tempPath[128];
    FILE *fp;

    printf("\n--- Register New Bus Pass ---\n");
    readLine("Enter Student ID (e.g., AP1111111111): ", pass.studentID, sizeof(pass.studentID));
    if (strlen(pass.studentID) < 4)
    {
        printf("[Error] Invalid Student ID.\n");
        return;
    }

    count = loadApplications(list, MAX_APPS);
    for (i = 0; i < count; i++)
    {
        if (list[i].applicationID >= nextAppId) nextAppId = list[i].applicationID + 1;
        if (equalsIgnoreCase(list[i].studentID, pass.studentID) && strcmp(list[i].status, "Pending") == 0)
        {
            printf("[Error] Student ID %s already has a Pending application (App ID: %d).\n",
                   pass.studentID, list[i].applicationID);
            return;
        }
    }

    pass.applicationID = nextAppId;
    readLine("Enter Full Name: ", pass.name, sizeof(pass.name));
    readLine("Enter Department: ", pass.department, sizeof(pass.department));
    readLine("Enter Contact Number: ", pass.contact, sizeof(pass.contact));
    readLine("Enter Email Address: ", pass.email, sizeof(pass.email));
    readLine("Enter Bus Route (e.g. R-101): ", pass.route, sizeof(pass.route));
    readLine("Enter Boarding Point: ", pass.boardingPoint, sizeof(pass.boardingPoint));
    readLine("Enter Pass Type (Monthly/Quarterly/Semester): ", pass.passType, sizeof(pass.passType));
    readLine("Enter Validity Date (YYYY-MM-DD): ", pass.validity, sizeof(pass.validity));

    if (strlen(pass.name) == 0 || strlen(pass.route) == 0 || strlen(pass.boardingPoint) == 0)
    {
        printf("[Error] Name, Route, and Boarding Point cannot be empty.\n");
        return;
    }

    snprintf(pass.status, sizeof(pass.status), "%s", "Pending");

    getBusPassFilePaths(dataPath, tempPath, sizeof(dataPath));
    fp = fopen(dataPath, "a");
    if (fp == NULL)
    {
        printf("[Error] Could not open %s for writing.\n", dataPath);
        return;
    }

    fprintf(fp, "%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n",
            pass.applicationID,
            pass.studentID,
            pass.name,
            pass.department,
            pass.contact,
            pass.email,
            pass.route,
            pass.boardingPoint,
            pass.passType,
            pass.validity,
            pass.status);
    fclose(fp);

    printf("\n[Success] Application registered! Generated Application ID: %d (Status: Pending)\n",
           pass.applicationID);
}

void displayAllApplications(void)
{
    struct BusPass list[MAX_APPS];
    int count = loadApplications(list, MAX_APPS);
    int i;

    printf("\n--- All Bus Pass Applications (%d records) ---\n", count);
    if (count == 0)
    {
        printf("No bus pass applications found.\n");
        return;
    }

    printf("%-6s | %-14s | %-18s | %-16s | %-8s | %-10s | %-10s\n",
           "AppID", "StudentID", "Name", "Department", "Route", "PassType", "Status");
    printf("---------------------------------------------------------------------------------------------------\n");

    for (i = 0; i < count; i++)
    {
        printf("%-6d | %-14.14s | %-18.18s | %-16.16s | %-8.8s | %-10.10s | %-10.10s\n",
               list[i].applicationID,
               list[i].studentID,
               list[i].name,
               list[i].department,
               list[i].route,
               list[i].passType,
               list[i].status);
    }
}

void searchApplicationByStudentID(void)
{
    struct BusPass list[MAX_APPS];
    int count = loadApplications(list, MAX_APPS);
    char targetId[24];
    int i, found = 0;

    printf("\n--- Search Application by Student ID ---\n");
    if (count == 0)
    {
        printf("No records available to search.\n");
        return;
    }

    readLine("Enter Student ID to search (e.g., AP1111111111): ", targetId, sizeof(targetId));
    if (strlen(targetId) == 0)
    {
        printf("[Error] Invalid Student ID.\n");
        return;
    }

    for (i = 0; i < count; i++)
    {
        if (equalsIgnoreCase(list[i].studentID, targetId))
        {
            found = 1;
            printf("\nRecord Found:\n");
            printf("  Application ID : %d\n", list[i].applicationID);
            printf("  Student ID     : %s\n", list[i].studentID);
            printf("  Name           : %s\n", list[i].name);
            printf("  Department     : %s\n", list[i].department);
            printf("  Contact        : %s\n", list[i].contact);
            printf("  Email          : %s\n", list[i].email);
            printf("  Route          : %s\n", list[i].route);
            printf("  Boarding Point : %s\n", list[i].boardingPoint);
            printf("  Pass Type      : %s\n", list[i].passType);
            printf("  Validity       : %s\n", list[i].validity);
            printf("  Status         : %s\n", list[i].status);
        }
    }

    if (!found)
    {
        printf("No bus pass application found for Student ID %s.\n", targetId);
    }
}

void updateBusPassDetails(void)
{
    struct BusPass list[MAX_APPS];
    int count = loadApplications(list, MAX_APPS);
    int targetAppId, i, found = 0;
    char input[64];

    printf("\n--- Update Bus Pass Details ---\n");
    if (count == 0)
    {
        printf("No records available to update.\n");
        return;
    }

    targetAppId = readInt("Enter Application ID to update: ");
    if (targetAppId <= 0)
    {
        printf("[Error] Invalid Application ID.\n");
        return;
    }

    for (i = 0; i < count; i++)
    {
        if (list[i].applicationID == targetAppId)
        {
            found = 1;
            printf("Editing Application #%d (%s - Student ID %s)\n",
                   list[i].applicationID, list[i].name, list[i].studentID);
            printf("(Leave blank and press Enter to keep current value)\n");

            printf("Current Route [%s]: ", list[i].route);
            readLine("", input, sizeof(input));
            if (strlen(input) > 0) snprintf(list[i].route, sizeof(list[i].route), "%.29s", input);

            printf("Current Boarding Point [%s]: ", list[i].boardingPoint);
            readLine("", input, sizeof(input));
            if (strlen(input) > 0) snprintf(list[i].boardingPoint, sizeof(list[i].boardingPoint), "%.49s", input);

            printf("Current Pass Type [%s]: ", list[i].passType);
            readLine("", input, sizeof(input));
            if (strlen(input) > 0) snprintf(list[i].passType, sizeof(list[i].passType), "%.19s", input);

            printf("Current Validity [%s]: ", list[i].validity);
            readLine("", input, sizeof(input));
            if (strlen(input) > 0) snprintf(list[i].validity, sizeof(list[i].validity), "%.19s", input);

            printf("Current Status [%s] (Pending/Approved/Rejected): ", list[i].status);
            readLine("", input, sizeof(input));
            if (strlen(input) > 0) snprintf(list[i].status, sizeof(list[i].status), "%.19s", input);
            break;
        }
    }

    if (!found)
    {
        printf("[Error] Application ID %d not found.\n", targetAppId);
        return;
    }

    if (saveApplications(list, count))
    {
        printf("[Success] Application #%d updated permanently.\n", targetAppId);
    }
}

int main(void)
{
    int choice;

    do
    {
        printf("\n============================================\n");
        printf("       BUS PASS REGISTRATION SYSTEM\n");
        printf("============================================\n");
        printf("1. Register New Bus Pass\n");
        printf("2. Display All Applications\n");
        printf("3. Search Application by Student ID\n");
        printf("4. Update Bus Pass Details\n");
        printf("5. Exit\n");
        printf("--------------------------------------------\n");

        choice = readInt("Enter your choice (1-5): ");

        switch (choice)
        {
        case 1: registerBusPass(); break;
        case 2: displayAllApplications(); break;
        case 3: searchApplicationByStudentID(); break;
        case 4: updateBusPassDetails(); break;
        case 5: printf("\nThank you for using BUSPASS Console System. Goodbye!\n"); break;
        default: printf("\n[Error] Invalid choice. Please enter a number from 1 to 5.\n");
        }
    } while (choice != 5);

    return 0;
}
