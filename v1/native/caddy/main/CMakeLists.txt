set(PRODUCT_NATIVE "${CMAKE_CURRENT_LIST_DIR}/../..")
set(SELECTED_LAB "${PRODUCT_NATIVE}/selected-lab")
set(CADDY_ASSETS "${CMAKE_CURRENT_BINARY_DIR}/dock_assets.c")
# During IDF's dependency scan, do not invoke tools or generate source files.
if(NOT CMAKE_BUILD_EARLY_EXPANSION)
  idf_build_get_property(IDF_PYTHON PYTHON)
  execute_process(COMMAND "${IDF_PYTHON}"
    "${CMAKE_CURRENT_LIST_DIR}/../extract_assets.py"
    "${PRODUCT_NATIVE}" "${CADDY_ASSETS}"
    RESULT_VARIABLE CADDY_ASSET_RESULT)
  if(NOT CADDY_ASSET_RESULT EQUAL 0)
    message(FATAL_ERROR "Exact Dock asset extraction failed")
  endif()
  set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
    "${SELECTED_LAB}/core_art.c"
    "${PRODUCT_NATIVE}/shared/lab_font_data.c"
    "${PRODUCT_NATIVE}/shared/lab_heading_font_data.c"
    "${CMAKE_CURRENT_LIST_DIR}/../extract_assets.py")
  set_source_files_properties("${CADDY_ASSETS}" PROPERTIES GENERATED TRUE)
endif()
idf_component_register(SRCS "main.c" "${CADDY_ASSETS}"
  "${PRODUCT_NATIVE}/ui/display.c" "${PRODUCT_NATIVE}/ui/dock_ui.c"
  "${SELECTED_LAB}/ui_assets.c"
  INCLUDE_DIRS "." "${PRODUCT_NATIVE}/ui" "${SELECTED_LAB}" "${PRODUCT_NATIVE}/shared"
  REQUIRES lvgl PRIV_REQUIRES log heap)
target_compile_features(${COMPONENT_LIB} PRIVATE c_std_17)
target_compile_options(${COMPONENT_LIB} PRIVATE -Wall -Wextra -Werror)
