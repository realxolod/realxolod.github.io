---
title: "Attendance Data Cleaning Pipeline"
stack: ["Python", "Pandas"]
status: "In progress"
description: "Parses raw turnstile CSV logs, flags missing check-outs, and sums worked hours."
detailLabel: "Before / After"
detailLines:
  - "IN  raw.csv:  08:01 IN | 08:01 IN (dup) | 16:30 [NO EXIT]"
  - "OUT clean:    df.drop_duplicates() -> 14 missing exits flagged"
  - "OUT payroll:  08:01 - 16:30 | 8.0h net (98.4% clean)"
github: "https://github.com/realxolod?tab=repositories"
order: 1
---
