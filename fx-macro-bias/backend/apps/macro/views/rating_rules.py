"""Rating Rules API views — CRUD + versioning."""
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


def _rules_for_indicator(indicator):
    from apps.macro.models import RatingRule

    return RatingRule.objects.filter(
        indicator=indicator, is_active=True
    ).select_related("version").order_by("min_diff")


def _serialize_rule(r):
    return {
        "id": r.pk,
        "min_diff": r.min_diff,
        "max_diff": r.max_diff,
        "rating": r.rating,
        "version": str(r.version) if r.version else None,
        "updated_at": r.updated_at.strftime("%Y-%m-%d %H:%M"),
    }


@api_view(["GET", "POST"])
def rules_list(request, indicator_slug):
    from apps.macro.models import MacroIndicator, RatingRule, RuleVersion

    try:
        indicator = MacroIndicator.objects.get(slug=indicator_slug, is_active=True)
    except MacroIndicator.DoesNotExist:
        return Response({"error": "Indicator not found."}, status=404)

    if request.method == "GET":
        rules = _rules_for_indicator(indicator)
        latest_version = (
            RuleVersion.objects.filter(indicator=indicator)
            .order_by("-version_number")
            .first()
        )
        return Response({
            "indicator": indicator.name,
            "slug": indicator.slug,
            "version": str(latest_version) if latest_version else None,
            "last_updated": latest_version.created_at.strftime("%Y-%m-%d") if latest_version else None,
            "rules": [_serialize_rule(r) for r in rules],
        })

    # POST — add a new rule and bump version
    data = request.data
    try:
        min_diff = float(data["min_diff"]) if data.get("min_diff") not in (None, "") else None
        max_diff = float(data["max_diff"]) if data.get("max_diff") not in (None, "") else None
        rating_val = int(data["rating"])
    except (KeyError, ValueError) as e:
        return Response({"error": str(e)}, status=400)

    latest = RuleVersion.objects.filter(indicator=indicator).order_by("-version_number").first()
    new_version_num = (latest.version_number + 1) if latest else 1
    version_obj = RuleVersion.objects.create(
        indicator=indicator,
        version_number=new_version_num,
        notes=data.get("notes", ""),
        created_by=getattr(request.user, "username", "admin"),
    )
    rule = RatingRule.objects.create(
        indicator=indicator,
        version=version_obj,
        min_diff=min_diff,
        max_diff=max_diff,
        rating=rating_val,
    )
    return Response(_serialize_rule(rule), status=201)


@api_view(["PUT", "DELETE"])
def rule_detail(request, indicator_slug, rule_id):
    from apps.macro.models import MacroIndicator, RatingRule, RuleVersion

    try:
        indicator = MacroIndicator.objects.get(slug=indicator_slug)
        rule = RatingRule.objects.get(pk=rule_id, indicator=indicator, is_active=True)
    except (MacroIndicator.DoesNotExist, RatingRule.DoesNotExist):
        return Response({"error": "Not found."}, status=404)

    if request.method == "DELETE":
        rule.is_active = False
        rule.save(update_fields=["is_active", "updated_at"])
        return Response(status=204)

    # PUT
    data = request.data
    latest = RuleVersion.objects.filter(indicator=indicator).order_by("-version_number").first()
    new_version_num = (latest.version_number + 1) if latest else 1
    version_obj = RuleVersion.objects.create(
        indicator=indicator,
        version_number=new_version_num,
        notes=f"Edited rule #{rule.pk}",
        created_by=getattr(request.user, "username", "admin"),
    )
    try:
        rule.min_diff = float(data["min_diff"]) if data.get("min_diff") not in (None, "") else None
        rule.max_diff = float(data["max_diff"]) if data.get("max_diff") not in (None, "") else None
        rule.rating = int(data["rating"])
        rule.version = version_obj
        rule.save()
    except (KeyError, ValueError) as e:
        return Response({"error": str(e)}, status=400)

    return Response(_serialize_rule(rule))
