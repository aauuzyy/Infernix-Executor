/**
 * Infernix Native Addon
 * 
 * This addon wraps the Xeno DLL to provide injection and execution capabilities.
 * It loads the DLL dynamically and exposes its functions to Node.js via N-API.
 */

#include <napi.h>
#include <windows.h>
#include <string>
#include <vector>
#include <tlhelp32.h>
#include <psapi.h>

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

// Initialize - loads the DLL and resolves functions
Napi::Value Initialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (g_initialized) {
        return Napi::Boolean::New(env, true);
    }

    bool debugConsole = false;
    if (info.Length() > 0 && info[0].IsBoolean()) {
        debugConsole = info[0].As<Napi::Boolean>().Value();
    }

    // Get DLL path from environment variable
    const char* dllPath = std::getenv("INFERNIX_DLL_PATH");
    if (!dllPath) {
        dllPath = std::getenv("XENO_DLL_PATH"); // Fallback to Xeno DLL
    }

    if (!dllPath) {
        Napi::Error::New(env, "DLL path not set").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    // Load the DLL
    g_xenoDll = LoadLibraryA(dllPath);
    if (!g_xenoDll) {
        DWORD error = GetLastError();
        std::string errMsg = "Failed to load DLL. Error: " + std::to_string(error);
        Napi::Error::New(env, errMsg).ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    // Resolve function pointers
    g_initialize = (InitializeFn)GetProcAddress(g_xenoDll, "Initialize");
    g_attach = (AttachFn)GetProcAddress(g_xenoDll, "Attach");
    g_getClients = (GetClientsFn)GetProcAddress(g_xenoDll, "GetClients");
    g_execute = (ExecuteFn)GetProcAddress(g_xenoDll, "Execute");
    g_setSetting = (SetSettingFn)GetProcAddress(g_xenoDll, "SetSetting");
    g_getVersion = (GetVersionFn)GetProcAddress(g_xenoDll, "GetVersion");

    // Call DLL's initialize if available
    if (g_initialize) {
        bool result = g_initialize(debugConsole);
        if (!result) {
            Napi::Error::New(env, "DLL initialization failed").ThrowAsJavaScriptException();
            return Napi::Boolean::New(env, false);
        }
    }

    g_initialized = true;
    return Napi::Boolean::New(env, true);
}

// Attach to Roblox
Napi::Value Attach(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_initialized) {
        return Napi::Boolean::New(env, false);
    }

    if (g_attach) {
        g_attach();
        return Napi::Boolean::New(env, true);
    }

    return Napi::Boolean::New(env, false);
}

// Get connected clients as JSON string
Napi::Value GetClients(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_initialized || !g_getClients) {
        // Return empty array as fallback - list processes manually
        auto pids = FindRobloxProcesses();
        std::string json = "[";
        for (size_t i = 0; i < pids.size(); i++) {
            if (i > 0) json += ",";
            json += "{\"pid\":" + std::to_string(pids[i]) + ",\"attached\":false}";
        }
        json += "]";
        return Napi::String::New(env, json);
    }

    const char* result = g_getClients();
    return Napi::String::New(env, result ? result : "[]");
}

// Execute script on a specific PID
Napi::Value Execute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_initialized) {
        return Napi::Boolean::New(env, false);
    }

    if (info.Length() < 2) {
        Napi::Error::New(env, "Execute requires (pid, script)").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    int pid = info[0].As<Napi::Number>().Int32Value();
    std::string script = info[1].As<Napi::String>().Utf8Value();

    if (g_execute) {
        g_execute(pid, script.c_str());
        return Napi::Boolean::New(env, true);
    }

    return Napi::Boolean::New(env, false);
}

// Execute on all attached clients
Napi::Value ExecuteAll(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_initialized) {
        return Napi::Boolean::New(env, false);
    }

    if (info.Length() < 1) {
        Napi::Error::New(env, "ExecuteAll requires (script)").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    std::string script = info[0].As<Napi::String>().Utf8Value();

    // Get all clients and execute on each
    if (g_getClients && g_execute) {
        const char* clientsJson = g_getClients();
        // For simplicity, we'll just try to execute - the DLL handles client management
        // In a real implementation, we'd parse the JSON and loop through attached clients
        auto pids = FindRobloxProcesses();
        for (DWORD pid : pids) {
            g_execute(pid, script.c_str());
        }
        return Napi::Boolean::New(env, true);
    }

    return Napi::Boolean::New(env, false);
}

// Set a setting
Napi::Value SetSetting(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_initialized || !g_setSetting) {
        return Napi::Boolean::New(env, false);
    }

    if (info.Length() < 2) {
        return Napi::Boolean::New(env, false);
    }

    int type = info[0].As<Napi::Number>().Int32Value();
    int value = info[1].As<Napi::Number>().Int32Value();

    g_setSetting(type, value);
    return Napi::Boolean::New(env, true);
}

// Get version
Napi::Value Version(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_initialized || !g_getVersion) {
        return Napi::String::New(env, "1.0.0");
    }

    const char* ver = g_getVersion();
    return Napi::String::New(env, ver ? ver : "1.0.0");
}

// Kill Roblox processes
Napi::Value KillRoblox(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto pids = FindRobloxProcesses();
    int killed = 0;

    for (DWORD pid : pids) {
        HANDLE proc = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
        if (proc) {
            if (TerminateProcess(proc, 0)) {
                killed++;
            }
            CloseHandle(proc);
        }
    }

    return Napi::Number::New(env, killed);
}

// Cleanup
Napi::Value Cleanup(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (g_xenoDll) {
        FreeLibrary(g_xenoDll);
        g_xenoDll = nullptr;
    }

    g_initialize = nullptr;
    g_attach = nullptr;
    g_getClients = nullptr;
    g_execute = nullptr;
    g_setSetting = nullptr;
    g_getVersion = nullptr;
    g_initialized = false;

    return Napi::Boolean::New(env, true);
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("initialize", Napi::Function::New(env, Initialize));
    exports.Set("attach", Napi::Function::New(env, Attach));
    exports.Set("getClients", Napi::Function::New(env, GetClients));
    exports.Set("execute", Napi::Function::New(env, Execute));
    exports.Set("executeAll", Napi::Function::New(env, ExecuteAll));
    exports.Set("setSetting", Napi::Function::New(env, SetSetting));
    exports.Set("version", Napi::Function::New(env, Version));
    exports.Set("killRoblox", Napi::Function::New(env, KillRoblox));
    exports.Set("cleanup", Napi::Function::New(env, Cleanup));
    return exports;
}

NODE_API_MODULE(infernix, Init)
