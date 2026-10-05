# The pinned vendor subset omits examples/demos. Upstream esp.cmake names those
# absent include directories, so register the identical source set directly.
# No vendor source, configuration generator or dependency is downloaded/edited.
set(LVGL_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../../vendor/lvgl")
file(GLOB_RECURSE LVGL_SOURCES
  "${LVGL_ROOT}/src/*.c" "${LVGL_ROOT}/src/*.cpp")
idf_component_register(SRCS ${LVGL_SOURCES}
  INCLUDE_DIRS "${LVGL_ROOT}" "${LVGL_ROOT}/include" "${LVGL_ROOT}/src"
  PRIV_REQUIRES esp_timer log)
target_compile_definitions(${COMPONENT_LIB} PUBLIC
  LV_KCONFIG_IGNORE=1
  "LV_CONF_PATH=\"${CMAKE_CURRENT_LIST_DIR}/../../main/lv_conf.h\"")
