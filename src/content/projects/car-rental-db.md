---
title: "Car Rental Database & Billing"
stack: ["SQL", "VBA"]
description: "3NF relational database with automated invoicing queries and user forms."
detailLabel: "Core Logic"
detailLines:
  - "Schema (3NF): [Vehicles] 1 -- N [Rentals] N -- 1 [Customers]"
  - "SELECT CustomerID, SUM(Days * Rate) AS Total_CZK"
  - "FROM Rentals GROUP BY CustomerID;"
github: "https://github.com/realxolod?tab=repositories"
order: 3
---
