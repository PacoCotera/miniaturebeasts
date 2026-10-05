cmake_minimum_required(VERSION 3.28)
project(critter_lab_replacement VERSION 0.1.0 LANGUAGES C)
add_executable(critter_lab_replacement main.c model.c store.c ../shared/save_bytes.c)
target_include_directories(critter_lab_replacement PRIVATE ../shared)
set_target_properties(critter_lab_replacement PROPERTIES
  C_STANDARD 17 C_STANDARD_REQUIRED YES C_EXTENSIONS NO)
target_compile_options(critter_lab_replacement PRIVATE -Wall -Wextra -Wpedantic -Werror)
