cmake_minimum_required(VERSION 3.28)
# Compile only the headless current Dock consumer and its required IDF components.
set(COMPONENTS main)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(critter_caddy_ui VERSION 0.1.0)
