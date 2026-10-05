cmake_minimum_required(VERSION 3.28)
project(critter_lab_native VERSION 0.1.0 LANGUAGES C)

add_executable(critter_lab main.c demo_store.c ../shared/save_bytes.c ../shared/demo_domain.c ../shared/demo_pixels.c ../shared/native_font.c ../shared/portable_font_data.c
  ../shared/lab_font_data.c ../shared/lab_scene.c)
target_include_directories(critter_lab PRIVATE ../shared)
set_target_properties(critter_lab PROPERTIES C_STANDARD 17 C_STANDARD_REQUIRED YES C_EXTENSIONS NO)
target_compile_options(critter_lab PRIVATE -Wall -Wextra -Wpedantic -Werror)
target_compile_definitions(critter_lab PRIVATE CRITTER_LAB_SCENE=1 CRITTER_LAB_VERSION="${PROJECT_VERSION}")
target_link_options(critter_lab PRIVATE "-Wl,-Map=${CMAKE_CURRENT_BINARY_DIR}/critter_lab.map")

# Isolated selected-screen proof; leave the existing Lab model/executable intact.
option(CRITTER_BUILD_SELECTED_LAB "Build the selected native Lab screen proof" OFF)
if(CRITTER_BUILD_SELECTED_LAB)
  include(CTest)
  add_subdirectory(../selected-lab selected-lab)
endif()
