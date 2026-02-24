# Top User Use-Cases & Interaction Categories

This document defines the core categories for HeyPoco interactions. Each category serves as a foundation for designing specific rich UI components and AI extraction logic.

---

## 1. Personal Finance
*   **Examples:** Logging expenses, tracking income, checking budget status, subscription management.
*   **Rich UI Components:** `ExpenseCard`, `SummaryCard`, `BudgetProgressBar`.

## 2. Career & Professional Growth
*   **Examples:** Job applications (Stripe, etc.), project milestones, meeting notes, networking follow-ups.
*   **Rich UI Components:** `TimelineCard`, `StatusTracker`, `ProfessionalNote`.

## 3. Health & Wellness
*   **Examples:** Gym sessions, meal tracking, sleep quality reflections, mental health checks.
*   **Rich UI Components:** `BiometricCard`, `MealLog`, `WellnessReflection`.

## 4. Life Journaling & Memories
*   **Examples:** Daily highlights, specific memories with people, thoughts on a sunset, gratitude logs.
*   **Rich UI Components:** `MemoryCard` (Image support), `ReflectionBubble`, `QuoteCard`.

## 5. Tasks & Time Management
*   **Examples:** "Remind me to...", scheduling gym at 6pm, deadline tracking, daily to-dos.
*   **Rich UI Components:** `ScheduleCard`, `TaskListItem`, `UrgencyIndicator`.

## 6. Knowledge & Continuous Learning
*   **Examples:** Insights from a book, new concepts learned, ideas for a startup, course notes.
*   **Rich UI Components:** `IdeaCard`, `KnowledgeSnippet`, `SourceReference`.

## 7. Relationships & Social Circle
*   **Examples:** Gift ideas for family, last time talked to a friend, birthday planning, social commitments.
*   **Rich UI Components:** `RelationshipCard`, `GiftTracker`, `SocialEventCard`.

## 8. Travel & Logistics
*   **Examples:** Flight confirmation details, hotel stay notes, trip itineraries, packing lists.
*   **Rich UI Components:** `ItineraryCard`, `BookingSummary`, `ChecklistCard`.

## 9. Home & Household
*   **Examples:** Home repairs, plant watering logs, grocery lists, car maintenance records.
*   **Rich UI Components:** `HouseholdLog`, `MaintenanceCard`, `ShoppingList`.

## 10. Life Milestones & Updates
*   **Examples:** Moving to a new city, starting a new role, big life decisions, health breakthroughs.
*   **Rich UI Components:** `MilestoneCard`, `HighImpactUpdate`, `DecisionLog`.

## 11. Intelligence & Recall States
*   **Examples:** AI confusion over a query, partial memory retrieval, direct answer unavailable, ambiguous references.
*   **Rich UI Components:** `HazyMemoryCard` (Confused/No Results), `FragmentedRecallCard` (Partial Knowledge Fallback), `AmbiguityResolver`.

## 12. Pet Care & Life
*   **Examples:** Feeding times, medication schedules, vet appointment highlights, cute behavior logs.
*   **Rich UI Components:** `PetCareCard`, `HealthLog`, `MilestoneTracker`.

## 13. Media Curation & Recommendations
*   **Examples:** Movie suggestions from friends, books to read, podcast highlights, shared Spotify playlists.
*   **Rich UI Components:** `MediaCurationCard`, `LinkPreview`, `ReviewSnippet`.

## 14. Vehicle Maintenance & Logistics
*   **Examples:** Oil change reminders, insurance renewal, tire pressure logs, trip mileage.
*   **Rich UI Components:** `VehicleLogCard`, `MaintenanceAlert`, `TripSummary`.

## 15. Academic Success (College Life)
*   **Examples:** GPA tracking, assignment deadlines, lecture highlights, study group coordination.
*   **Rich UI Components:** `AcademicCard`, `GradeTracker`, `StudyTimer`.

## 16. Professional Syncs & Networking
*   **Examples:** Meeting transcript summaries, action items, new LinkedIn connections, project milestones.
*   **Rich UI Components:** `MeetingBriefCard`, `ActionItemList`, `ContactCard`.

## 17. Knowledge & Resource Vault
*   **Examples:** Shared Google Docs, saved research links, PDF library, collaboration permissions.
*   **Rich UI Components:** `SharedVaultCard`, `LinkPreviewGrid`, `DocAccessLog`.

## 18. Daily Triage & Quick Capture
*   **Examples:** Unsorted voice notes, quick text blurbs, "basic" daily mood check-ins, thing to-be-categorized.
*   **Rich UI Components:** `InboxSweepCard`, `QuickCaptureSticky`, `MoodSparkline`.

---

### UI Implementation Strategy
For each category, we aim to move away from text-only messages to **Rich Cards** that:
1.  **Summarize**: Provide the most vital info at a glance.
2.  **Visualise**: Use colors, icons, and progress bars.
3.  **Action**: Offer context-aware buttons (e.g., "Add to Calendar", "View Budget").
