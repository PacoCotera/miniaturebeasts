#define _POSIX_C_SOURCE 200809L
#include "save_bytes.h"

#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/file.h>
#include <unistd.h>

#define SAVE_PATH_CAPACITY 4096u

int save_bytes_lock(const char *path) {
  char name[SAVE_PATH_CAPACITY];
  int fd;
  if (!path ||
      snprintf(name, sizeof(name), "%s.lock", path) >= (int)sizeof(name))
    return -1;
  fd = open(name, O_CREAT | O_RDWR, 0600);
  if (fd < 0)
    return -1;
  if (flock(fd, LOCK_EX) < 0) {
    close(fd);
    return -1;
  }
  return fd;
}

static int split_path(const char *path, char directory[SAVE_PATH_CAPACITY],
                      char temporary[SAVE_PATH_CAPACITY]) {
  char target[SAVE_PATH_CAPACITY];
  char *slash;
  size_t target_length;
  if (!path ||
      snprintf(target, sizeof(target), "%s", path) >= (int)sizeof(target))
    return 0;
  target_length = strlen(target);
  if (target_length == 0 || target[target_length - 1u] == '/')
    return 0;
  slash = strrchr(target, '/');
  if (!slash) {
    if (snprintf(directory, SAVE_PATH_CAPACITY, ".") >= (int)SAVE_PATH_CAPACITY)
      return 0;
  } else if (slash == target) {
    slash[1] = '\0';
    if (snprintf(directory, SAVE_PATH_CAPACITY, "%s", target) >=
        (int)SAVE_PATH_CAPACITY)
      return 0;
  } else {
    *slash = '\0';
    if (snprintf(directory, SAVE_PATH_CAPACITY, "%s", target) >=
        (int)SAVE_PATH_CAPACITY)
      return 0;
  }
  return snprintf(temporary, SAVE_PATH_CAPACITY, "%s.tmp", path) <
         (int)SAVE_PATH_CAPACITY;
}

int save_bytes_write_status(const char *path, const void *data, size_t length) {
  char directory[SAVE_PATH_CAPACITY];
  char temporary[SAVE_PATH_CAPACITY];
  FILE *file;
  int directory_fd;
  int file_fd;
  int failed;
  if ((!data && length != 0) || !split_path(path, directory, temporary))
    return SAVE_BYTES_NOT_COMMITTED;

  /* Open the parent before creating or renaming the replacement. This keeps
   * all fallible path preparation on the pre-commit side of rename. */
  directory_fd = open(directory, O_RDONLY);
  if (directory_fd < 0)
    return SAVE_BYTES_NOT_COMMITTED;
  file_fd = open(temporary, O_CREAT | O_TRUNC | O_WRONLY, 0600);
  if (file_fd < 0) {
    close(directory_fd);
    return SAVE_BYTES_NOT_COMMITTED;
  }
  file = fdopen(file_fd, "wb");
  if (!file) {
    close(file_fd);
    unlink(temporary);
    close(directory_fd);
    return SAVE_BYTES_NOT_COMMITTED;
  }

  failed = fwrite(data, 1, length, file) != length;
  if (fflush(file) != 0 || fsync(file_fd) != 0)
    failed = 1;
  if (fclose(file) != 0)
    failed = 1;
  if (failed || rename(temporary, path) != 0) {
    unlink(temporary);
    close(directory_fd);
    return SAVE_BYTES_NOT_COMMITTED;
  }

  failed = fsync(directory_fd);
  close(directory_fd);
  return failed ? SAVE_BYTES_COMMITTED_DURABILITY_UNCERTAIN
                : SAVE_BYTES_COMMITTED;
}

int save_bytes_write(const char *path, const void *data, size_t length) {
  return save_bytes_write_status(path, data, length) == SAVE_BYTES_COMMITTED
             ? 0
             : -1;
}
