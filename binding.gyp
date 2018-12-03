{
    "targets": [
        {
            "target_name": "fpdf",
            "variables": {
                "myLibraries": "cairo poppler-qt5",
                "osLibraries": ""
            },            
            "sources": [
                "./src/fpdf.cc",
                "./src/fpdfpoppler.cc",
                "./src/fpdfpopplerA.cc"
            ],
            'cflags!': [ '-fno-exceptions' ],
            'cflags_cc!': [ '-fno-exceptions' ],
            "cflags": [
                "<!@(pkg-config --cflags <(osLibraries) <(myLibraries))"
            ],
            'conditions': [
              ['OS=="linux"', {
                "variables": {
                  "osLibraries": "Qt5Core Qt5Gui"
                }}]
            ],
            "xcode_settings": {
                'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                "OTHER_CFLAGS": [
                    '-mmacosx-version-min=10.11',
                    '-std=c++11',
                    '-stdlib=libc++',                
                    "-fexceptions",
                    "-lboost_python37",
                    "<!@(pkg-config --cflags <(osLibraries) <(myLibraries))"
                ]
            },
            "libraries": [
                "<!@(pkg-config --libs <(osLibraries) <(myLibraries))"
            ],
            "include_dirs" : [
               "<!(node -e \"require('nan')\")"
            ]
        }
    ]
}
