from django.urls import path
from apps.macro.views import dashboard, rating_rules, macro_data, final_score, settings

urlpatterns = [
    # Dashboard
    path("dashboard/kpis", dashboard.kpis),
    path("dashboard/latest-data", dashboard.latest_data),
    path("dashboard/data-status", dashboard.data_status),

    # Rating Rules
    path("rating-rules/<str:indicator_slug>", rating_rules.rules_list),
    path("rating-rules/<str:indicator_slug>/<int:rule_id>", rating_rules.rule_detail),

    # Macro Data
    path("macro-data/matrix", macro_data.macro_matrix),
    path("macro-data/manual-entry", macro_data.manual_entry),
    path("macro-data/differential", macro_data.differential_table),
    path("macro-data/rating", macro_data.rating_table),
    path("macro-data/recalculate", macro_data.trigger_recalculation),

    # Final Score
    path("final-score/matrix", final_score.score_matrix),
    path("final-score/drilldown", final_score.score_drilldown),

    # Settings & Orchestrator
    path("settings", settings.settings_config),
    path("settings/run-scraper", settings.trigger_scraper_pipeline),
]
