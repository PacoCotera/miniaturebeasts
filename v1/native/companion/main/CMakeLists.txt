set(PRODUCT_NATIVE "${CMAKE_CURRENT_LIST_DIR}/../..")
set(SELECTED_LAB "${PRODUCT_NATIVE}/selected-lab")
set(COMPANION_ASSETS "${CMAKE_CURRENT_BINARY_DIR}/companion_assets.c")
if(NOT CMAKE_BUILD_EARLY_EXPANSION)
  idf_build_get_property(IDF_PYTHON PYTHON)
  execute_process(COMMAND "${IDF_PYTHON}"
    "${CMAKE_CURRENT_LIST_DIR}/../extract_assets.py"
    "${PRODUCT_NATIVE}" "${COMPANION_ASSETS}"
    RESULT_VARIABLE COMPANION_ASSET_RESULT)
  if(NOT COMPANION_ASSET_RESULT EQUAL 0)
    message(FATAL_ERROR "Exact Companion asset extraction failed")
  endif()
  set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
    "${SELECTED_LAB}/core_art.c" "${SELECTED_LAB}/field_art.c"
    "${SELECTED_LAB}/overview_assets.c"
    "${PRODUCT_NATIVE}/shared/lab_font_data.c"
    "${PRODUCT_NATIVE}/shared/lab_heading_font_data.c"
    "${CMAKE_CURRENT_LIST_DIR}/../extract_assets.py"
    "${PRODUCT_NATIVE}/caddy/extract_assets.py")
  set_source_files_properties("${COMPANION_ASSETS}" PROPERTIES GENERATED TRUE)
endif()
idf_component_register(SRCS "main.c" "${COMPANION_ASSETS}"
  "${PRODUCT_NATIVE}/ui/display.c" "${PRODUCT_NATIVE}/ui/probe_geometry.c"
  "${PRODUCT_NATIVE}/ui/companion_cargo_ui.c"
  "${PRODUCT_NATIVE}/ui/companion_resident_ui.c"
  "${SELECTED_LAB}/probe_ui.c" "${SELECTED_LAB}/field_art.c"
  "${SELECTED_LAB}/ui_assets.c" "${SELECTED_LAB}/ui_theme.c"
  INCLUDE_DIRS "." "${PRODUCT_NATIVE}/ui" "${SELECTED_LAB}" "${PRODUCT_NATIVE}/shared"
  REQUIRES lvgl PRIV_REQUIRES log heap)
target_compile_features(${COMPONENT_LIB} PRIVATE c_std_17)
target_compile_options(${COMPONENT_LIB} PRIVATE -Wall -Wextra -Werror)
