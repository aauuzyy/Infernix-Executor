/**
 * Infernix Notification Hook Addon
 * 
 * This addon wraps the Xeno DLL and hooks Windows API functions
 * to intercept and rebrand notifications from "Xeno" to "Infernix".
 * 
 * It uses IAT (Import Address Table) hooking to intercept string operations.
 */

#include <napi.h>
#include <windows.h>
#include <string>
#include <vector>
#include <tlhelp32.h>
#include <psapi.h>
#include <detours.h>  // Microsoft Detours for API hooking

// DLL function typedefs
typedef bool (*InitializeFn)(bool debugConsole);
typedef void (*AttachFn)();
typedef const char* (*GetClientsFn)();
typedef void (*ExecuteFn)(int pid, const char* script);
typedef void (*SetSettingFn)(int type, int value);
typedef const char* (*GetVersionFn)();

// Global DLL handle and function pointers
static HMODULE g_xenoDll = nullptr;
static InitializeFn g_initialize = nullptr;
static AttachFn g_attach = nullptr;
static GetClientsFn g_getClients = nullptr;
static ExecuteFn g_execute = nullptr;
static SetSettingFn g_setSetting = nullptr;
static GetVersionFn g_getVersion = nullptr;
static bool g_initialized = false;

// Original function pointers for hooks
static int (WINAPI *Real_MessageBoxA)(HWND, LPCSTR, LPCSTR, UINT) = MessageBoxA;
static int (WINAPI *Real_MessageBoxW)(HWND, LPCWSTR, LPCWSTR, UINT) = MessageBoxW;

// Hook for MessageBoxA - replace Xeno with Infernix
int WINAPI Hooked_MessageBoxA(HWND hWnd, LPCSTR lpText, LPCSTR lpCaption, UINT uType) {
    std::string text = lpText ? lpText : "";
    std::string caption = lpCaption ? lpCaption : "";
    
    // Replace Xeno with Infernix in text
    size_t pos;
    while ((pos = text.find("Xeno")) != std::string::npos) {
        text.replace(pos, 4, "Infernix");
    }
    while ((pos = text.find("XENO")) != std::string::npos) {
        text.replace(pos, 4, "INFERNIX");
    }
    
    // Replace in caption
    while ((pos = caption.find("Xeno")) != std::string::npos) {
        caption.replace(pos, 4, "Infernix");
    }
    while ((pos = caption.find("XENO")) != std::string::npos) {
        caption.replace(pos, 4, "INFERNIX");
    }
    
    return Real_MessageBoxA(hWnd, text.c_str(), caption.c_str(), uType);
}

// Hook for MessageBoxW
int WINAPI Hooked_MessageBoxW(HWND hWnd, LPCWSTR lpText, LPCWSTR lpCaption, UINT uType) {
    std::wstring text = lpText ? lpText : L"";
    std::wstring caption = lpCaption ? lpCaption : L"";
    
    size_t pos;
    while ((pos = text.find(L"Xeno")) != std::wstring::npos) {
        text.replace(pos, 4, L"Infernix");
    }
    while ((pos = text.find(L"XENO")) != std::wstring::npos) {
        text.replace(pos, 4, L"INFERNIX");
    }
    while ((pos = caption.find(L"Xeno")) != std::wstring::npos) {
        caption.replace(pos, 4, L"Infernix");
    }
    while ((pos = caption.find(L"XENO")) != std::wstring::npos) {
        caption.replace(pos, 4, L"INFERNIX");
    }
    
    return Real_MessageBoxW(hWnd, text.c_str(), caption.c_str(), uType);
}

// Install hooks
bool InstallHooks() {
    DetourTransactionBegin();
    DetourUpdateThread(GetCurrentThread());
    DetourAttach(&(PVOID&)Real_MessageBoxA, Hooked_MessageBoxA);
    DetourAttach(&(PVOID&)Real_MessageBoxW, Hooked_MessageBoxW);
    LONG error = DetourTransactionCommit();
    return error == NO_ERROR;
}

// Remove hooks
bool RemoveHooks() {
    DetourTransactionBegin();
    DetourUpdateThread(GetCurrentThread());
    DetourDetach(&(PVOID&)Real_MessageBoxA, Hooked_MessageBoxA);
    DetourDetach(&(PVOID&)Real_MessageBoxW, Hooked_MessageBoxW);
    LONG error = DetourTransactionCommit();
    return error == NO_ERROR;
}

// Find Roblox processes
std::vector<DWORD> FindRobloxProcesses() {
    std::vector<DWORD> pids;
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) return pids;

    PROCESSENTRY32W pe;
    pe.dwSize = sizeof(pe);

    if (Process32FirstW(snapshot, &pe)) {
        do {
            if (_wcsicmp(pe.szExeFile, L"RobloxPlayerBeta.exe") == 0) {
                pids.push_back(pe.th32ProcessID);
            }
        } while (Process32NextW(snapshot, &pe));
    }

    CloseHandle(snapshot);
    return pids;
}

// Rest of addon code...
// (Initialize, Attach, Execute, etc.)
