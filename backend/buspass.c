#include "buspass.h"

/* ============================================================================
 * UTILITY FUNCTIONS (Paths, String Cleaning, URL Decoding, JSON Output)
 * ============================================================================ */

static void resolveDataPath(const char *filename, char *outPath, size_t maxLen)
{
    FILE *probe = fopen("data/admin.txt", "r");
    if (probe != NULL)
    {
        fclose(probe);
        snprintf(outPath, maxLen, "data/%s", filename);
        return;
    }

    probe = fopen("../data/admin.txt", "r");
    if (probe != NULL)
    {
        fclose(probe);
        snprintf(outPath, maxLen, "../data/%s", filename);
        return;
    }

    snprintf(outPath, maxLen, "data/%s", filename);
}

static void stripNewline(char *str)
{
    size_t len = strlen(str);
    while (len > 0 && (str[len - 1] == '\n' || str[len - 1] == '\r'))
    {
        str[len - 1] = '\0';
        len--;
    }
}

static void sanitizeField(char *str)
{
    size_t i;
    for (i = 0; str[i] != '\0'; i++)
    {
        if (str[i] == '|' || str[i] == '\n' || str[i] == '\r')
        {
            str[i] = ' ';
        }
    }
}

static void toUpperStr(char *str)
{
    size_t i;
    for (i = 0; str[i] != '\0'; i++)
    {
        str[i] = (char)toupper((unsigned char)str[i]);
    }
}

static int equalsIgnoreCase(const char *a, const char *b)
{
    size_t i = 0;
    while (a[i] != '\0' && b[i] != '\0')
    {
        if (tolower((unsigned char)a[i]) != tolower((unsigned char)b[i]))
        {
            return 0;
        }
        i++;
    }
    return a[i] == '\0' && b[i] == '\0';
}

static void printJsonEscaped(const char *str)
{
    size_t i;
    putchar('"');
    for (i = 0; str[i] != '\0'; i++)
    {
        unsigned char c = (unsigned char)str[i];
        if (c == '"') printf("\\\"");
        else if (c == '\\') printf("\\\\");
        else if (c == '\b') printf("\\b");
        else if (c == '\f') printf("\\f");
        else if (c == '\n') printf("\\n");
        else if (c == '\r') printf("\\r");
        else if (c == '\t') printf("\\t");
        else if (c < 0x20) printf("\\u%04x", c);
        else putchar(c);
    }
    putchar('"');
}

static void printJsonError(const char *message)
{
    printf("{\"success\":false,\"error\":");
    printJsonEscaped(message);
    printf("}\n");
}

static int hexVal(char c)
{
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static void urlDecode(const char *src, char *dest, size_t maxLen)
{
    size_t i = 0, j = 0;
    while (src[i] != '\0' && j + 1 < maxLen)
    {
        if (src[i] == '+')
        {
            dest[j++] = ' ';
            i++;
        }
        else if (src[i] == '%' && isxdigit((unsigned char)src[i + 1]) && isxdigit((unsigned char)src[i + 2]))
        {
            dest[j++] = (char)((hexVal(src[i + 1]) << 4) | hexVal(src[i + 2]));
            i += 3;
        }
        else
        {
            dest[j++] = src[i++];
        }
    }
    dest[j] = '\0';
}

static int parseFormEncoded(const char *input, struct KeyValue params[], int maxParams)
{
    char buffer[4096];
    char *token;
    int count = 0;

    if (input == NULL || strlen(input) == 0) return 0;

    snprintf(buffer, sizeof(buffer), "%s", input);
    token = strtok(buffer, "&");
    while (token != NULL && count < maxParams)
    {
        char *eq = strchr(token, '=');
        if (eq != NULL)
        {
            *eq = '\0';
            urlDecode(token, params[count].key, sizeof(params[count].key));
            urlDecode(eq + 1, params[count].value, sizeof(params[count].value));
            count++;
        }
        token = strtok(NULL, "&");
    }
    return count;
}

static const char *getParam(struct KeyValue params[], int count, const char *key)
{
    int i;
    for (i = 0; i < count; i++)
    {
        if (strcmp(params[i].key, key) == 0)
        {
            return params[i].value;
        }
    }
    return "";
}

static int splitPipeFields(char *line, char *fields[], int maxFields)
{
    int count = 0;
    char *start = line;
    char *p = line;

    while (*p != '\0' && count < maxFields - 1)
    {
        if (*p == '|')
        {
            *p = '\0';
            fields[count++] = start;
            start = p + 1;
        }
        p++;
    }
    if (count < maxFields)
    {
        fields[count++] = start;
    }
    return count;
}

/* ============================================================================
 * STUDENT MANAGEMENT (data/students.txt)
 * ============================================================================ */

static int loadAllStudents(struct Student students[], int maxCount)
{
    char path[MAX_PATH_LEN];
    FILE *fp;
    char line[512];
    int count = 0;

    resolveDataPath("students.txt", path, sizeof(path));
    fp = fopen(path, "r");
    if (fp == NULL) return 0;

    while (fgets(line, sizeof(line), fp) != NULL && count < maxCount)
    {
        char *fields[6];
        stripNewline(line);
        if (strlen(line) == 0) continue;
        if (splitPipeFields(line, fields, 6) == 6)
        {
            snprintf(students[count].studentID, sizeof(students[count].studentID), "%s", fields[0]);
            snprintf(students[count].fullName, sizeof(students[count].fullName), "%s", fields[1]);
            snprintf(students[count].department, sizeof(students[count].department), "%s", fields[2]);
            snprintf(students[count].email, sizeof(students[count].email), "%s", fields[3]);
            snprintf(students[count].contact, sizeof(students[count].contact), "%s", fields[4]);
            snprintf(students[count].password, sizeof(students[count].password), "%s", fields[5]);
            count++;
        }
    }

    fclose(fp);
    return count;
}

void registerStudent(struct KeyValue params[], int paramCount)
{
    struct Student existing[MAX_RECORDS];
    struct Student newStudent;
    int total, i;
    char path[MAX_PATH_LEN];
    FILE *fp;

    const char *sIdStr = getParam(params, paramCount, "studentID");
    const char *fullName = getParam(params, paramCount, "fullName");
    const char *department = getParam(params, paramCount, "department");
    const char *email = getParam(params, paramCount, "email");
    const char *contact = getParam(params, paramCount, "contact");
    const char *password = getParam(params, paramCount, "password");

    if (strlen(sIdStr) == 0 || strlen(fullName) == 0 || strlen(department) == 0 ||
        strlen(email) == 0 || strlen(contact) == 0 || strlen(password) == 0)
    {
        printJsonError("All registration fields are required.");
        return;
    }

    if (strlen(sIdStr) < 4)
    {
        printJsonError("Please enter a valid Student ID (e.g., AP1111111111).");
        return;
    }

    if (strlen(password) < 4)
    {
        printJsonError("Password must be at least 4 characters long.");
        return;
    }

    if (strchr(email, '@') == NULL || strchr(email, '.') == NULL)
    {
        printJsonError("Please enter a valid university email address.");
        return;
    }

    snprintf(newStudent.studentID, sizeof(newStudent.studentID), "%s", sIdStr);
    sanitizeField(newStudent.studentID);
    toUpperStr(newStudent.studentID);

    snprintf(newStudent.fullName, sizeof(newStudent.fullName), "%s", fullName);
    sanitizeField(newStudent.fullName);

    snprintf(newStudent.department, sizeof(newStudent.department), "%s", department);
    sanitizeField(newStudent.department);

    snprintf(newStudent.email, sizeof(newStudent.email), "%s", email);
    sanitizeField(newStudent.email);

    snprintf(newStudent.contact, sizeof(newStudent.contact), "%s", contact);
    sanitizeField(newStudent.contact);

    snprintf(newStudent.password, sizeof(newStudent.password), "%s", password);
    sanitizeField(newStudent.password);

    total = loadAllStudents(existing, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (equalsIgnoreCase(existing[i].studentID, newStudent.studentID))
        {
            printJsonError("A student account with this Student ID already exists.");
            return;
        }
        if (equalsIgnoreCase(existing[i].email, newStudent.email))
        {
            printJsonError("This email address is already registered.");
            return;
        }
    }

    resolveDataPath("students.txt", path, sizeof(path));
    fp = fopen(path, "a");
    if (fp == NULL)
    {
        printJsonError("Unable to open student records file for writing.");
        return;
    }

    fprintf(fp, "%s|%s|%s|%s|%s|%s\n",
            newStudent.studentID,
            newStudent.fullName,
            newStudent.department,
            newStudent.email,
            newStudent.contact,
            newStudent.password);
    fclose(fp);

    printf("{\"success\":true,\"message\":\"Student registered successfully.\",\"student\":{");
    printf("\"studentID\":");
    printJsonEscaped(newStudent.studentID);
    printf(",\"fullName\":");
    printJsonEscaped(newStudent.fullName);
    printf(",\"department\":");
    printJsonEscaped(newStudent.department);
    printf(",\"email\":");
    printJsonEscaped(newStudent.email);
    printf(",\"contact\":");
    printJsonEscaped(newStudent.contact);
    printf("}}\n");
}

void loginStudent(struct KeyValue params[], int paramCount)
{
    struct Student students[MAX_RECORDS];
    int total, i, found = 0;

    const char *identifier = getParam(params, paramCount, "identifier");
    const char *password = getParam(params, paramCount, "password");

    if (strlen(identifier) == 0 || strlen(password) == 0)
    {
        printJsonError("Student ID/Email and password are required.");
        return;
    }

    total = loadAllStudents(students, MAX_RECORDS);
    if (total == 0)
    {
        printJsonError("No registered students found. Please register with your Student ID first.");
        return;
    }

    for (i = 0; i < total; i++)
    {
        int idMatch = equalsIgnoreCase(students[i].studentID, identifier);
        int emailMatch = equalsIgnoreCase(students[i].email, identifier);

        if ((idMatch || emailMatch) && strcmp(students[i].password, password) == 0)
        {
            found = 1;
            printf("{\"success\":true,\"message\":\"Login successful.\",\"student\":{");
            printf("\"studentID\":");
            printJsonEscaped(students[i].studentID);
            printf(",\"fullName\":");
            printJsonEscaped(students[i].fullName);
            printf(",\"department\":");
            printJsonEscaped(students[i].department);
            printf(",\"email\":");
            printJsonEscaped(students[i].email);
            printf(",\"contact\":");
            printJsonEscaped(students[i].contact);
            printf("}}\n");
            break;
        }
    }

    if (!found)
    {
        printJsonError("Invalid Student ID/Email or password.");
    }
}

void listStudents(struct KeyValue params[], int paramCount)
{
    struct Student students[MAX_RECORDS];
    int total, i, printed = 0;
    const char *searchQuery = getParam(params, paramCount, "studentID");

    (void)paramCount;
    total = loadAllStudents(students, MAX_RECORDS);

    printf("{\"success\":true,\"students\":[");
    for (i = 0; i < total; i++)
    {
        if (strlen(searchQuery) > 0 && strstr(students[i].studentID, searchQuery) == NULL &&
            !equalsIgnoreCase(students[i].studentID, searchQuery))
        {
            continue;
        }
        if (printed > 0) printf(",");
        printf("{\"studentID\":");
        printJsonEscaped(students[i].studentID);
        printf(",\"fullName\":");
        printJsonEscaped(students[i].fullName);
        printf(",\"department\":");
        printJsonEscaped(students[i].department);
        printf(",\"email\":");
        printJsonEscaped(students[i].email);
        printf(",\"contact\":");
        printJsonEscaped(students[i].contact);
        printf("}");
        printed++;
    }
    printf("]}\n");
}

/* ============================================================================
 * BUS PASS APPLICATIONS (data/buspass.txt)
 * ============================================================================ */

static int loadAllPasses(struct BusPass passes[], int maxCount)
{
    char path[MAX_PATH_LEN];
    FILE *fp;
    char line[512];
    int count = 0;

    resolveDataPath("buspass.txt", path, sizeof(path));
    fp = fopen(path, "r");
    if (fp == NULL) return 0;

    while (fgets(line, sizeof(line), fp) != NULL && count < maxCount)
    {
        char *fields[11];
        stripNewline(line);
        if (strlen(line) == 0) continue;
        if (splitPipeFields(line, fields, 11) == 11)
        {
            passes[count].applicationID = atoi(fields[0]);
            snprintf(passes[count].studentID, sizeof(passes[count].studentID), "%s", fields[1]);
            snprintf(passes[count].name, sizeof(passes[count].name), "%s", fields[2]);
            snprintf(passes[count].department, sizeof(passes[count].department), "%s", fields[3]);
            snprintf(passes[count].contact, sizeof(passes[count].contact), "%s", fields[4]);
            snprintf(passes[count].email, sizeof(passes[count].email), "%s", fields[5]);
            snprintf(passes[count].route, sizeof(passes[count].route), "%s", fields[6]);
            snprintf(passes[count].boardingPoint, sizeof(passes[count].boardingPoint), "%s", fields[7]);
            snprintf(passes[count].passType, sizeof(passes[count].passType), "%s", fields[8]);
            snprintf(passes[count].validity, sizeof(passes[count].validity), "%s", fields[9]);
            snprintf(passes[count].status, sizeof(passes[count].status), "%s", fields[10]);
            count++;
        }
    }

    fclose(fp);
    return count;
}

static int saveAllPasses(struct BusPass passes[], int count)
{
    char path[MAX_PATH_LEN], tempPath[MAX_PATH_LEN];
    FILE *fp;
    int i;

    resolveDataPath("buspass.txt", path, sizeof(path));
    resolveDataPath("buspass.tmp", tempPath, sizeof(tempPath));

    fp = fopen(tempPath, "w");
    if (fp == NULL) return 0;

    for (i = 0; i < count; i++)
    {
        fprintf(fp, "%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n",
                passes[i].applicationID,
                passes[i].studentID,
                passes[i].name,
                passes[i].department,
                passes[i].contact,
                passes[i].email,
                passes[i].route,
                passes[i].boardingPoint,
                passes[i].passType,
                passes[i].validity,
                passes[i].status);
    }

    fclose(fp);
    remove(path);
    return rename(tempPath, path) == 0 ? 1 : 0;
}

static void printPassJson(const struct BusPass *p)
{
    printf("{");
    printf("\"applicationID\":%d,", p->applicationID);
    printf("\"studentID\":");
    printJsonEscaped(p->studentID);
    printf(",\"name\":");
    printJsonEscaped(p->name);
    printf(",\"department\":");
    printJsonEscaped(p->department);
    printf(",\"contact\":");
    printJsonEscaped(p->contact);
    printf(",\"email\":");
    printJsonEscaped(p->email);
    printf(",\"route\":");
    printJsonEscaped(p->route);
    printf(",\"boardingPoint\":");
    printJsonEscaped(p->boardingPoint);
    printf(",\"passType\":");
    printJsonEscaped(p->passType);
    printf(",\"validity\":");
    printJsonEscaped(p->validity);
    printf(",\"status\":");
    printJsonEscaped(p->status);
    printf("}");
}

void addPass(struct KeyValue params[], int paramCount)
{
    struct BusPass passes[MAX_RECORDS];
    struct BusPass newPass;
    int total, nextId = 1001, i;
    char path[MAX_PATH_LEN];
    FILE *fp;

    const char *studentID = getParam(params, paramCount, "studentID");
    const char *name = getParam(params, paramCount, "name");
    const char *department = getParam(params, paramCount, "department");
    const char *contact = getParam(params, paramCount, "contact");
    const char *email = getParam(params, paramCount, "email");
    const char *route = getParam(params, paramCount, "route");
    const char *boardingPoint = getParam(params, paramCount, "boardingPoint");
    const char *passType = getParam(params, paramCount, "passType");
    const char *validity = getParam(params, paramCount, "validity");

    if (strlen(studentID) == 0 || strlen(name) == 0 || strlen(department) == 0 ||
        strlen(contact) == 0 || strlen(email) == 0 || strlen(route) == 0 ||
        strlen(boardingPoint) == 0 || strlen(passType) == 0 || strlen(validity) == 0)
    {
        printJsonError("All bus pass application fields are required.");
        return;
    }

    snprintf(newPass.studentID, sizeof(newPass.studentID), "%s", studentID);
    sanitizeField(newPass.studentID);
    toUpperStr(newPass.studentID);

    total = loadAllPasses(passes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (passes[i].applicationID >= nextId)
        {
            nextId = passes[i].applicationID + 1;
        }
        if (equalsIgnoreCase(passes[i].studentID, newPass.studentID) &&
            strcmp(passes[i].status, "Pending") == 0)
        {
            printJsonError("You already have a Pending bus pass application awaiting review.");
            return;
        }
    }

    newPass.applicationID = nextId;
    snprintf(newPass.name, sizeof(newPass.name), "%s", name);
    sanitizeField(newPass.name);
    snprintf(newPass.department, sizeof(newPass.department), "%s", department);
    sanitizeField(newPass.department);
    snprintf(newPass.contact, sizeof(newPass.contact), "%s", contact);
    sanitizeField(newPass.contact);
    snprintf(newPass.email, sizeof(newPass.email), "%s", email);
    sanitizeField(newPass.email);
    snprintf(newPass.route, sizeof(newPass.route), "%s", route);
    sanitizeField(newPass.route);
    snprintf(newPass.boardingPoint, sizeof(newPass.boardingPoint), "%s", boardingPoint);
    sanitizeField(newPass.boardingPoint);
    snprintf(newPass.passType, sizeof(newPass.passType), "%s", passType);
    sanitizeField(newPass.passType);
    snprintf(newPass.validity, sizeof(newPass.validity), "%s", validity);
    sanitizeField(newPass.validity);
    snprintf(newPass.status, sizeof(newPass.status), "%s", "Pending");

    resolveDataPath("buspass.txt", path, sizeof(path));
    fp = fopen(path, "a");
    if (fp == NULL)
    {
        printJsonError("Failed to open bus pass data file for saving.");
        return;
    }

    fprintf(fp, "%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n",
            newPass.applicationID,
            newPass.studentID,
            newPass.name,
            newPass.department,
            newPass.contact,
            newPass.email,
            newPass.route,
            newPass.boardingPoint,
            newPass.passType,
            newPass.validity,
            newPass.status);
    fclose(fp);

    printf("{\"success\":true,\"message\":\"Application submitted successfully.\",\"application\":");
    printPassJson(&newPass);
    printf("}\n");
}

void displayPass(struct KeyValue params[], int paramCount)
{
    struct BusPass passes[MAX_RECORDS];
    int total, i, printed = 0;

    const char *studentID = getParam(params, paramCount, "studentID");
    const char *statusFilter = getParam(params, paramCount, "status");

    total = loadAllPasses(passes, MAX_RECORDS);

    printf("{\"success\":true,\"applications\":[");
    for (i = 0; i < total; i++)
    {
        if (strlen(studentID) > 0 && !equalsIgnoreCase(passes[i].studentID, studentID))
        {
            continue;
        }
        if (strlen(statusFilter) > 0 && strcmp(statusFilter, "All") != 0 &&
            strcmp(passes[i].status, statusFilter) != 0)
        {
            continue;
        }
        if (printed > 0) printf(",");
        printPassJson(&passes[i]);
        printed++;
    }
    printf("]}\n");
}

void searchPass(struct KeyValue params[], int paramCount)
{
    struct BusPass passes[MAX_RECORDS];
    int total, i, printed = 0;

    const char *query = getParam(params, paramCount, "query");
    const char *studentID = getParam(params, paramCount, "studentID");
    const char *appIDStr = getParam(params, paramCount, "applicationID");

    int qNum = atoi(query);
    int aNum = atoi(appIDStr);

    total = loadAllPasses(passes, MAX_RECORDS);

    printf("{\"success\":true,\"applications\":[");
    for (i = 0; i < total; i++)
    {
        int match = 0;
        if (aNum > 0 && passes[i].applicationID == aNum)
        {
            match = 1;
        }
        else if (strlen(studentID) > 0 && equalsIgnoreCase(passes[i].studentID, studentID))
        {
            match = 1;
        }
        else if (strlen(query) > 0)
        {
            if ((qNum > 0 && passes[i].applicationID == qNum) ||
                strstr(passes[i].studentID, query) != NULL ||
                equalsIgnoreCase(passes[i].studentID, query) ||
                strstr(passes[i].name, query) != NULL ||
                strstr(passes[i].route, query) != NULL)
            {
                match = 1;
            }
        }
        else if (strlen(query) == 0 && strlen(studentID) == 0 && aNum == 0)
        {
            match = 1;
        }

        if (match)
        {
            if (printed > 0) printf(",");
            printPassJson(&passes[i]);
            printed++;
        }
    }
    printf("]}\n");
}

void updatePass(struct KeyValue params[], int paramCount)
{
    struct BusPass passes[MAX_RECORDS];
    int total, i, found = 0;

    int targetAppId = atoi(getParam(params, paramCount, "applicationID"));
    const char *route = getParam(params, paramCount, "route");
    const char *boardingPoint = getParam(params, paramCount, "boardingPoint");
    const char *passType = getParam(params, paramCount, "passType");
    const char *validity = getParam(params, paramCount, "validity");
    const char *status = getParam(params, paramCount, "status");

    if (targetAppId <= 0)
    {
        printJsonError("Valid Application ID is required.");
        return;
    }

    total = loadAllPasses(passes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (passes[i].applicationID == targetAppId)
        {
            found = 1;
            if (strlen(route) > 0) { snprintf(passes[i].route, sizeof(passes[i].route), "%s", route); sanitizeField(passes[i].route); }
            if (strlen(boardingPoint) > 0) { snprintf(passes[i].boardingPoint, sizeof(passes[i].boardingPoint), "%s", boardingPoint); sanitizeField(passes[i].boardingPoint); }
            if (strlen(passType) > 0) { snprintf(passes[i].passType, sizeof(passes[i].passType), "%s", passType); sanitizeField(passes[i].passType); }
            if (strlen(validity) > 0) { snprintf(passes[i].validity, sizeof(passes[i].validity), "%s", validity); sanitizeField(passes[i].validity); }
            if (strlen(status) > 0) { snprintf(passes[i].status, sizeof(passes[i].status), "%s", status); sanitizeField(passes[i].status); }
            break;
        }
    }

    if (!found)
    {
        printJsonError("Application ID not found.");
        return;
    }

    if (!saveAllPasses(passes, total))
    {
        printJsonError("Failed to save updated bus pass record.");
        return;
    }

    printf("{\"success\":true,\"message\":\"Bus pass application updated successfully.\"}\n");
}

static void setPassStatus(struct KeyValue params[], int paramCount, const char *newStatus)
{
    struct BusPass passes[MAX_RECORDS];
    int total, i, found = 0;
    int targetAppId = atoi(getParam(params, paramCount, "applicationID"));

    if (targetAppId <= 0)
    {
        printJsonError("Valid Application ID is required.");
        return;
    }

    total = loadAllPasses(passes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (passes[i].applicationID == targetAppId)
        {
            found = 1;
            snprintf(passes[i].status, sizeof(passes[i].status), "%s", newStatus);
            break;
        }
    }

    if (!found)
    {
        printJsonError("Application ID not found.");
        return;
    }

    if (!saveAllPasses(passes, total))
    {
        printJsonError("Failed to update application status in data file.");
        return;
    }

    printf("{\"success\":true,\"message\":\"Application #%d marked as %s.\"}\n",
           targetAppId, newStatus);
}

void approvePass(struct KeyValue params[], int paramCount) { setPassStatus(params, paramCount, "Approved"); }
void rejectPass(struct KeyValue params[], int paramCount) { setPassStatus(params, paramCount, "Rejected"); }

void renewPass(struct KeyValue params[], int paramCount)
{
    struct BusPass passes[MAX_RECORDS];
    struct BusPass renewed;
    int total, i, foundIndex = -1, nextId = 1001;
    char path[MAX_PATH_LEN];
    FILE *fp;

    int targetAppId = atoi(getParam(params, paramCount, "applicationID"));
    const char *studentID = getParam(params, paramCount, "studentID");
    const char *passType = getParam(params, paramCount, "passType");
    const char *validity = getParam(params, paramCount, "validity");

    if (targetAppId <= 0 || strlen(studentID) == 0 || strlen(passType) == 0 || strlen(validity) == 0)
    {
        printJsonError("Valid pass selection, pass type, and new validity date are required for renewal.");
        return;
    }

    total = loadAllPasses(passes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (passes[i].applicationID >= nextId) nextId = passes[i].applicationID + 1;
        if (equalsIgnoreCase(passes[i].studentID, studentID) && strcmp(passes[i].status, "Pending") == 0)
        {
            printJsonError("A renewal or new application is already Pending review for your account.");
            return;
        }
        if (passes[i].applicationID == targetAppId && equalsIgnoreCase(passes[i].studentID, studentID))
        {
            foundIndex = i;
        }
    }

    if (foundIndex == -1)
    {
        printJsonError("Selected bus pass record was not found.");
        return;
    }
    if (strcmp(passes[foundIndex].status, "Approved") != 0)
    {
        printJsonError("Only an Approved bus pass can be renewed.");
        return;
    }

    renewed = passes[foundIndex];
    renewed.applicationID = nextId;
    snprintf(renewed.passType, sizeof(renewed.passType), "%s", passType);
    sanitizeField(renewed.passType);
    snprintf(renewed.validity, sizeof(renewed.validity), "%s", validity);
    sanitizeField(renewed.validity);
    snprintf(renewed.status, sizeof(renewed.status), "%s", "Pending");

    resolveDataPath("buspass.txt", path, sizeof(path));
    fp = fopen(path, "a");
    if (fp == NULL)
    {
        printJsonError("Unable to write renewal request.");
        return;
    }

    fprintf(fp, "%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n",
            renewed.applicationID,
            renewed.studentID,
            renewed.name,
            renewed.department,
            renewed.contact,
            renewed.email,
            renewed.route,
            renewed.boardingPoint,
            renewed.passType,
            renewed.validity,
            renewed.status);
    fclose(fp);

    printf("{\"success\":true,\"message\":\"Renewal request #%d submitted for approval.\",\"application\":",
           renewed.applicationID);
    printPassJson(&renewed);
    printf("}\n");
}

void generatePass(struct KeyValue params[], int paramCount)
{
    struct BusPass passes[MAX_RECORDS];
    struct BusPass latestApproved;
    struct BusPass latestAny;
    int total, i, hasApproved = 0, hasAny = 0;

    const char *studentID = getParam(params, paramCount, "studentID");
    int targetAppId = atoi(getParam(params, paramCount, "applicationID"));

    if (strlen(studentID) == 0 && targetAppId <= 0)
    {
        printJsonError("Student ID or Application ID is required to generate pass.");
        return;
    }

    total = loadAllPasses(passes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if ((targetAppId > 0 && passes[i].applicationID == targetAppId) ||
            (strlen(studentID) > 0 && equalsIgnoreCase(passes[i].studentID, studentID)))
        {
            latestAny = passes[i];
            hasAny = 1;
            if (strcmp(passes[i].status, "Approved") == 0)
            {
                latestApproved = passes[i];
                hasApproved = 1;
            }
        }
    }

    if (!hasAny)
    {
        printf("{\"success\":true,\"found\":false,\"pass\":null}\n");
        return;
    }

    printf("{\"success\":true,\"found\":true,\"isActivePass\":%s,\"pass\":",
           hasApproved ? "true" : "false");
    printPassJson(hasApproved ? &latestApproved : &latestAny);
    printf("}\n");
}

/* ============================================================================
 * BUS ROUTES MANAGEMENT (data/routes.txt)
 * ============================================================================ */

static int loadAllRoutes(struct BusRoute routes[], int maxCount)
{
    char path[MAX_PATH_LEN];
    FILE *fp;
    char line[512];
    int count = 0;

    resolveDataPath("routes.txt", path, sizeof(path));
    fp = fopen(path, "r");
    if (fp == NULL) return 0;

    while (fgets(line, sizeof(line), fp) != NULL && count < maxCount)
    {
        char *fields[5];
        stripNewline(line);
        if (strlen(line) == 0) continue;
        if (splitPipeFields(line, fields, 5) == 5)
        {
            snprintf(routes[count].routeNumber, sizeof(routes[count].routeNumber), "%s", fields[0]);
            snprintf(routes[count].startLocation, sizeof(routes[count].startLocation), "%s", fields[1]);
            snprintf(routes[count].endLocation, sizeof(routes[count].endLocation), "%s", fields[2]);
            snprintf(routes[count].boardingPoints, sizeof(routes[count].boardingPoints), "%s", fields[3]);
            snprintf(routes[count].status, sizeof(routes[count].status), "%s", fields[4]);
            count++;
        }
    }

    fclose(fp);
    return count;
}

static int saveAllRoutes(struct BusRoute routes[], int count)
{
    char path[MAX_PATH_LEN], tempPath[MAX_PATH_LEN];
    FILE *fp;
    int i;

    resolveDataPath("routes.txt", path, sizeof(path));
    resolveDataPath("routes.tmp", tempPath, sizeof(tempPath));

    fp = fopen(tempPath, "w");
    if (fp == NULL) return 0;

    for (i = 0; i < count; i++)
    {
        fprintf(fp, "%s|%s|%s|%s|%s\n",
                routes[i].routeNumber,
                routes[i].startLocation,
                routes[i].endLocation,
                routes[i].boardingPoints,
                routes[i].status);
    }

    fclose(fp);
    remove(path);
    return rename(tempPath, path) == 0 ? 1 : 0;
}

void displayRoutes(void)
{
    struct BusRoute routes[MAX_RECORDS];
    int total = loadAllRoutes(routes, MAX_RECORDS);
    int i;

    printf("{\"success\":true,\"routes\":[");
    for (i = 0; i < total; i++)
    {
        if (i > 0) printf(",");
        printf("{");
        printf("\"routeNumber\":");
        printJsonEscaped(routes[i].routeNumber);
        printf(",\"startLocation\":");
        printJsonEscaped(routes[i].startLocation);
        printf(",\"endLocation\":");
        printJsonEscaped(routes[i].endLocation);
        printf(",\"boardingPoints\":");
        printJsonEscaped(routes[i].boardingPoints);
        printf(",\"status\":");
        printJsonEscaped(routes[i].status);
        printf("}");
    }
    printf("]}\n");
}

void addRoute(struct KeyValue params[], int paramCount)
{
    struct BusRoute routes[MAX_RECORDS];
    struct BusRoute newRoute;
    int total, i;
    char path[MAX_PATH_LEN];
    FILE *fp;

    const char *routeNumber = getParam(params, paramCount, "routeNumber");
    const char *startLocation = getParam(params, paramCount, "startLocation");
    const char *endLocation = getParam(params, paramCount, "endLocation");
    const char *boardingPoints = getParam(params, paramCount, "boardingPoints");
    const char *status = getParam(params, paramCount, "status");

    if (strlen(routeNumber) == 0 || strlen(startLocation) == 0 ||
        strlen(endLocation) == 0 || strlen(boardingPoints) == 0)
    {
        printJsonError("All route fields are required.");
        return;
    }

    snprintf(newRoute.routeNumber, sizeof(newRoute.routeNumber), "%s", routeNumber);
    sanitizeField(newRoute.routeNumber);
    snprintf(newRoute.startLocation, sizeof(newRoute.startLocation), "%s", startLocation);
    sanitizeField(newRoute.startLocation);
    snprintf(newRoute.endLocation, sizeof(newRoute.endLocation), "%s", endLocation);
    sanitizeField(newRoute.endLocation);
    snprintf(newRoute.boardingPoints, sizeof(newRoute.boardingPoints), "%s", boardingPoints);
    sanitizeField(newRoute.boardingPoints);
    snprintf(newRoute.status, sizeof(newRoute.status), "%s", strlen(status) > 0 ? status : "Available");
    sanitizeField(newRoute.status);

    total = loadAllRoutes(routes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (equalsIgnoreCase(routes[i].routeNumber, newRoute.routeNumber))
        {
            printJsonError("A route with this Route Number already exists.");
            return;
        }
    }

    resolveDataPath("routes.txt", path, sizeof(path));
    fp = fopen(path, "a");
    if (fp == NULL)
    {
        printJsonError("Unable to open routes file for saving.");
        return;
    }

    fprintf(fp, "%s|%s|%s|%s|%s\n",
            newRoute.routeNumber,
            newRoute.startLocation,
            newRoute.endLocation,
            newRoute.boardingPoints,
            newRoute.status);
    fclose(fp);

    printf("{\"success\":true,\"message\":\"Route %s added successfully.\"}\n", newRoute.routeNumber);
}

void updateRoute(struct KeyValue params[], int paramCount)
{
    struct BusRoute routes[MAX_RECORDS];
    int total, i, found = 0;

    const char *routeNumber = getParam(params, paramCount, "routeNumber");
    const char *startLocation = getParam(params, paramCount, "startLocation");
    const char *endLocation = getParam(params, paramCount, "endLocation");
    const char *boardingPoints = getParam(params, paramCount, "boardingPoints");
    const char *status = getParam(params, paramCount, "status");

    if (strlen(routeNumber) == 0)
    {
        printJsonError("Route Number is required to update a route.");
        return;
    }

    total = loadAllRoutes(routes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (equalsIgnoreCase(routes[i].routeNumber, routeNumber))
        {
            found = 1;
            if (strlen(startLocation) > 0) { snprintf(routes[i].startLocation, sizeof(routes[i].startLocation), "%s", startLocation); sanitizeField(routes[i].startLocation); }
            if (strlen(endLocation) > 0) { snprintf(routes[i].endLocation, sizeof(routes[i].endLocation), "%s", endLocation); sanitizeField(routes[i].endLocation); }
            if (strlen(boardingPoints) > 0) { snprintf(routes[i].boardingPoints, sizeof(routes[i].boardingPoints), "%s", boardingPoints); sanitizeField(routes[i].boardingPoints); }
            if (strlen(status) > 0) { snprintf(routes[i].status, sizeof(routes[i].status), "%s", status); sanitizeField(routes[i].status); }
            break;
        }
    }

    if (!found)
    {
        printJsonError("Route Number not found.");
        return;
    }

    if (!saveAllRoutes(routes, total))
    {
        printJsonError("Failed to save updated route.");
        return;
    }

    printf("{\"success\":true,\"message\":\"Route %s updated successfully.\"}\n", routeNumber);
}

void deleteRoute(struct KeyValue params[], int paramCount)
{
    struct BusRoute routes[MAX_RECORDS];
    struct BusRoute remaining[MAX_RECORDS];
    int total, newCount = 0, i, found = 0;
    const char *routeNumber = getParam(params, paramCount, "routeNumber");

    if (strlen(routeNumber) == 0)
    {
        printJsonError("Route Number is required.");
        return;
    }

    total = loadAllRoutes(routes, MAX_RECORDS);
    for (i = 0; i < total; i++)
    {
        if (equalsIgnoreCase(routes[i].routeNumber, routeNumber)) found = 1;
        else remaining[newCount++] = routes[i];
    }

    if (!found)
    {
        printJsonError("Route Number not found.");
        return;
    }

    if (!saveAllRoutes(remaining, newCount))
    {
        printJsonError("Failed to remove route from data file.");
        return;
    }

    printf("{\"success\":true,\"message\":\"Route %s removed successfully.\"}\n", routeNumber);
}

/* ============================================================================
 * ADMIN AUTHENTICATION & REPORTS (data/admin.txt)
 * ============================================================================ */

void loginAdmin(struct KeyValue params[], int paramCount)
{
    char path[MAX_PATH_LEN];
    FILE *fp;
    char line[256];
    int found = 0;

    const char *username = getParam(params, paramCount, "username");
    const char *password = getParam(params, paramCount, "password");

    if (strlen(username) == 0 || strlen(password) == 0)
    {
        printJsonError("Admin username and password are required.");
        return;
    }

    resolveDataPath("admin.txt", path, sizeof(path));
    fp = fopen(path, "r");
    if (fp == NULL)
    {
        printJsonError("Administrator credentials file is missing.");
        return;
    }

    while (fgets(line, sizeof(line), fp) != NULL)
    {
        char *fields[3];
        stripNewline(line);
        if (strlen(line) == 0) continue;
        if (splitPipeFields(line, fields, 3) == 3)
        {
            if (strcmp(fields[0], username) == 0 && strcmp(fields[1], password) == 0)
            {
                found = 1;
                printf("{\"success\":true,\"message\":\"Admin login successful.\",\"admin\":{");
                printf("\"username\":");
                printJsonEscaped(fields[0]);
                printf(",\"fullName\":");
                printJsonEscaped(fields[2]);
                printf("}}\n");
                break;
            }
        }
    }

    fclose(fp);
    if (!found)
    {
        printJsonError("Invalid administrator username or password.");
    }
}

void getAdminReport(void)
{
    struct Student students[MAX_RECORDS];
    struct BusRoute routes[MAX_RECORDS];
    struct BusPass passes[MAX_RECORDS];

    int totalStudents = loadAllStudents(students, MAX_RECORDS);
    int routeTotal = loadAllRoutes(routes, MAX_RECORDS);
    int totalApps = loadAllPasses(passes, MAX_RECORDS);

    int pendingApps = 0, approvedApps = 0, rejectedApps = 0;
    char routeNames[64][30];
    int routeCounts[64];
    int countedRoutes = 0;
    int i, j;

    for (i = 0; i < routeTotal && countedRoutes < 64; i++)
    {
        snprintf(routeNames[countedRoutes], 30, "%s", routes[i].routeNumber);
        routeCounts[countedRoutes] = 0;
        countedRoutes++;
    }

    for (i = 0; i < totalApps; i++)
    {
        int matched = 0;
        if (strcmp(passes[i].status, "Pending") == 0) pendingApps++;
        else if (strcmp(passes[i].status, "Approved") == 0) approvedApps++;
        else if (strcmp(passes[i].status, "Rejected") == 0) rejectedApps++;

        for (j = 0; j < countedRoutes; j++)
        {
            if (strcmp(routeNames[j], passes[i].route) == 0)
            {
                routeCounts[j]++;
                matched = 1;
                break;
            }
        }
        if (!matched && countedRoutes < 64)
        {
            snprintf(routeNames[countedRoutes], 30, "%s", passes[i].route);
            routeCounts[countedRoutes] = 1;
            countedRoutes++;
        }
    }

    printf("{\"success\":true,\"report\":{");
    printf("\"totalStudents\":%d,", totalStudents);
    printf("\"totalApplications\":%d,", totalApps);
    printf("\"pendingApplications\":%d,", pendingApps);
    printf("\"approvedApplications\":%d,", approvedApps);
    printf("\"rejectedApplications\":%d,", rejectedApps);
    printf("\"routeCounts\":[");
    for (i = 0; i < countedRoutes; i++)
    {
        if (i > 0) printf(",");
        printf("{\"route\":");
        printJsonEscaped(routeNames[i]);
        printf(",\"count\":%d}", routeCounts[i]);
    }
    printf("]}}\n");
}

/* ============================================================================
 * CGI ENTRY POINT
 * ============================================================================ */

int main(void)
{
    struct KeyValue params[MAX_PARAMS];
    int paramCount = 0;
    char inputBuffer[4096] = {0};
    const char *method = getenv("REQUEST_METHOD");
    const char *query = getenv("QUERY_STRING");
    const char *action;

    printf("Content-Type: application/json; charset=UTF-8\r\n");
    printf("Cache-Control: no-store\r\n\r\n");

    if (method != NULL && strcmp(method, "POST") == 0)
    {
        const char *lenStr = getenv("CONTENT_LENGTH");
        int contentLen = lenStr != NULL ? atoi(lenStr) : 0;
        if (contentLen > 0)
        {
            if (contentLen >= (int)sizeof(inputBuffer))
            {
                contentLen = (int)sizeof(inputBuffer) - 1;
            }
            size_t bytesRead = fread(inputBuffer, 1, (size_t)contentLen, stdin);
            inputBuffer[bytesRead] = '\0';
        }
        else if (query != NULL)
        {
            snprintf(inputBuffer, sizeof(inputBuffer), "%s", query);
        }
    }
    else if (query != NULL)
    {
        snprintf(inputBuffer, sizeof(inputBuffer), "%s", query);
    }

    paramCount = parseFormEncoded(inputBuffer, params, MAX_PARAMS);
    action = getParam(params, paramCount, "action");

    if (strcmp(action, "registerStudent") == 0) registerStudent(params, paramCount);
    else if (strcmp(action, "loginStudent") == 0) loginStudent(params, paramCount);
    else if (strcmp(action, "loginAdmin") == 0) loginAdmin(params, paramCount);
    else if (strcmp(action, "addPass") == 0) addPass(params, paramCount);
    else if (strcmp(action, "displayPass") == 0) displayPass(params, paramCount);
    else if (strcmp(action, "searchPass") == 0) searchPass(params, paramCount);
    else if (strcmp(action, "updatePass") == 0) updatePass(params, paramCount);
    else if (strcmp(action, "approvePass") == 0) approvePass(params, paramCount);
    else if (strcmp(action, "rejectPass") == 0) rejectPass(params, paramCount);
    else if (strcmp(action, "renewPass") == 0) renewPass(params, paramCount);
    else if (strcmp(action, "routes") == 0 || strcmp(action, "displayRoutes") == 0) displayRoutes();
    else if (strcmp(action, "addRoute") == 0) addRoute(params, paramCount);
    else if (strcmp(action, "updateRoute") == 0) updateRoute(params, paramCount);
    else if (strcmp(action, "deleteRoute") == 0) deleteRoute(params, paramCount);
    else if (strcmp(action, "generatePass") == 0) generatePass(params, paramCount);
    else if (strcmp(action, "listStudents") == 0 || strcmp(action, "searchStudent") == 0) listStudents(params, paramCount);
    else if (strcmp(action, "adminReport") == 0) getAdminReport();
    else printJsonError("Unknown or missing CGI action parameter.");

    return 0;
}
