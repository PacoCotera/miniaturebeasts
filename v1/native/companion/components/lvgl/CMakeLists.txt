# Register the same pinned source subset as the existing Caddy IDF wrapper.
set(LVGL_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../../vendor/lvgl")
file(GLOB_RECURSE LVGL_SOURCES
  "${LVGL_ROOT}/src/*.c" "${LVGL_ROOT}/src/*.cpp")
idf_component_register(SRCS ${LVGL_SOURCES}
  INCLUDE_DIRS "${LVGL_ROOT}" "${LVGL_ROOT}/include" "${LVGL_ROOT}/src"
  PRIV_REQUIRES esp_timer log)
target_compile_definitions(${COMPONENT_LIB} PUBLIC
  LV_KCONFIG_IGNORE=1
  "LV_CONF_PATH=\"${CMAKE_CURRENT_LIST_DIR}/../../main/lv_conf.h\"")
