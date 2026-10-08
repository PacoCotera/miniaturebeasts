cmake_minimum_required(VERSION 3.28)
project(mb_face VERSION 0.1.0 LANGUAGES C)
set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED YES)
set(CMAKE_C_EXTENSIONS OFF)

# LVGL v9.6.0, unmodified, from the repository's own vendored tree (nothing is downloaded).
set(LV_BUILD_CONF_PATH "${CMAKE_CURRENT_SOURCE_DIR}/lv_conf.h" CACHE PATH "" FORCE)
foreach(option_name CONFIG_LV_BUILD_DEMOS CONFIG_LV_BUILD_EXAMPLES CONFIG_LV_USE_THORVG CONFIG_LV_USE_THORVG_INTERNAL
  LV_BUILD_INSTALL LV_BUILD_TESTS LV_BUILD_USE_KCONFIG LV_BUILD_SET_CONFIG_OPTS LV_FETCH_DEPENDENCIES LV_USE_FIND_PACKAGE LV_USE_PKG_CONFIG)
  set(${option_name} OFF CACHE BOOL "" FORCE)
endforeach()
add_subdirectory(../../v1/native/vendor/lvgl ${CMAKE_CURRENT_BINARY_DIR}/lvgl)

add_library(face STATIC src/face.c)
target_include_directories(face PUBLIC src)
target_link_libraries(face PUBLIC lvgl::lvgl)
target_compile_options(face PRIVATE -Wall -Wextra -Wpedantic -Werror)

if(EMSCRIPTEN)
  # The sandbox's face: one ES module and its .wasm; the page calls the exported functions (the props bridge arrives at L1).
  add_executable(face_wasm src/face.c)
  set_target_properties(face_wasm PROPERTIES OUTPUT_NAME face SUFFIX ".mjs")
  target_link_libraries(face_wasm PRIVATE lvgl::lvgl)
  target_include_directories(face_wasm PRIVATE src)
  target_link_options(face_wasm PRIVATE
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createFace -sENVIRONMENT=web,node -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=33554432
    -sFILESYSTEM=0 -sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP32,UTF8ToString
    "-sEXPORTED_FUNCTIONS=_face_init,_face_frame,_face_fb,_face_width,_face_height,_face_dirty_count,_face_dirty_rects,_face_hash,_face_key,_face_key_count,_face_last_key,_face_version,_malloc,_free"
    -sNO_EXIT_RUNTIME=1)
else()
  add_executable(face_native src/main_native.c)
  target_link_libraries(face_native PRIVATE face m)
  target_compile_options(face_native PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()
