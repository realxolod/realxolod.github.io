---
title: "Raster Image Processor"
stack: ["C", "File I/O"]
description: "Manipulating uncompressed BMP/PPM images in memory with custom grayscale and box blur filters."
detailLabel: "Core Logic"
detailLines:
  - "uint8_t *buf = malloc(w * h * 3);"
  - "uint8_t luma = (77 * r + 150 * g + 29 * b) >> 8;"
  - "apply_box_blur(buf, w, h, radius); free(buf);"
github: "https://github.com/realxolod?tab=repositories"
order: 2
---
