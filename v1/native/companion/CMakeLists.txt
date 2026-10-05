cmake_minimum_required(VERSION 3.28)
# Compile the current shared UI and its required SDK components only.
set(COMPONENTS main)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(critter_companion_ui VERSION 0.1.0)
