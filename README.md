# FreelanceHub Project Explanation

FreelanceHub is a platform designed to connect freelancers with job posters, facilitating remote work opportunities and project collaborations. Based on the database schemas, here's a brief explanation of how the platform functions:

Backend services Deployed Link: https://freelancehubserver.onrender.com 

API Documentation: https://periwinkle-mayonnaise-e3d.notion.site/1ae5e8d007ca80b180e4da7c85e7b01d

## Core Functionality

The platform revolves around three main entities:

1. **Users** - Two types of users operate on the platform:
   - **Job Posters**: Individuals or businesses who create job listings and hire freelancers
   - **Freelancers**: Professionals who apply for jobs by submitting bids

2. **Jobs** - Projects created by job posters that:
   - Have specific requirements (title, description, budget, deadline)
   - Require particular skills
   - Progress through various statuses (open → in-progress → completed/canceled)

3. **Bids** - Proposals submitted by freelancers that:
   - Include pricing (amount)
   - Specify delivery timeframes
   - Contain detailed proposals explaining approach
   - Move through different statuses (pending → accepted/rejected)

## User Journey

### For Job Posters:
- Create detailed job listings specifying requirements
- Review bids from freelancers
- Accept suitable bids to initiate projects
- Mark projects as completed when satisfied
- Track spending across multiple projects

### For Freelancers:
- Browse available jobs matching their skills
- Submit competitive bids for projects
- Work on accepted projects
- Track earnings across completed projects

## Platform Economics

The system maintains financial tracking with:
- **moneyEarned**: Tracks freelancer earnings
- **moneySpent**: Monitors job poster expenditures

This creates a transparent ecosystem where both parties can track their financial activities on the platform.

## User Profiles

Both user types maintain profiles containing:
- Professional details (skills, bio)
- Visual representation (profile image)
- Performance metrics (money earned/spent)

These profiles help build trust and facilitate better matching between jobs and qualified freelancers.
