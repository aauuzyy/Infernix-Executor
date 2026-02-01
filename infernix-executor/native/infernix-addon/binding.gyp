{
  "targets": [
    {
      "target_name": "infernix",
      "sources": [ "src/addon.cc" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [ "NAPI_EXPERIMENTAL", "NAPI_CPP_EXCEPTIONS" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": { 
              "ExceptionHandling": 1,
              "RuntimeLibrary": 2
            }
          },
          "libraries": []
        }]
      ]
    }
  ]
}
