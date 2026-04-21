"""Dashboard monitoring page — fetches /stats and /stats/drift from the API and renders Altair charts."""

from datetime import datetime, timedelta, timezone

import altair as alt
import pandas as pd
import requests
import streamlit as st

_AXIS = {"gridColor": "#1a3a5c", "labelColor": "#bad7eb", "titleColor": "#42d8f0"}
_MODEL_COLOR = "#0ec7e6"
_BG = "#04152b"
_MODEL_DISPLAY_NAMES = {
    "lr": "Logistic Regression",
    "xgboost": "XGBoost",
    "distilbert": "DistilBERT",
    "mental_roberta": "MentalRoBERTa",
}


def _metric_card(label: str, value: str, sub: str = "") -> str:
    """Custom HTML metric card that stays readable on the dark background."""
    sub_html = f'<div style="color:#7fa8c4;font-size:0.78rem;margin-top:0.25rem;">{sub}</div>' if sub else ""
    return f"""
    <div style="
        background:linear-gradient(145deg,#072341 0%,#04152b 100%);
        border:1px solid rgba(66,216,240,0.25);
        border-radius:0.5rem;
        padding:1.1rem 1.2rem 0.9rem;
    ">
        <div style="color:#7fa8c4;font-size:0.75rem;font-weight:700;
                    text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.4rem;">
            {label}
        </div>
        <div style="color:#ffffff;font-size:2rem;font-weight:800;line-height:1.1;">{value}</div>
        {sub_html}
    </div>
    """


def render_stats_page(api_url: str) -> None:
    """Render the live prediction statistics page."""
    st.markdown(
        """
        <div class="hero-banner">PROJET FINAL • BOOTCAMP DATA SCIENCE • ARTEFACT SCHOOL OF DATA</div>
        <h1 class="hero-title">Prediction<br/>Statistics</h1>
        <p class="hero-subtitle">
            Live usage metrics aggregated from every prediction the API has served.
            Refreshes on each page load.
        </p>
        """,
        unsafe_allow_html=True,
    )

    with st.spinner("Fetching stats…"):
        try:
            response = requests.get(f"{api_url}/stats", timeout=10)
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as exc:
            st.error(f"Could not fetch stats from API: {exc}")
            return

    drift: dict | None = None
    try:
        drift_response = requests.get(f"{api_url}/stats/drift", timeout=10)
        drift_response.raise_for_status()
        drift = drift_response.json()
    except requests.exceptions.RequestException:
        pass  # Drift section will be skipped gracefully

    total = data["total_predictions"]

    if total == 0:
        st.info("No predictions logged yet. Head to the **Prediction** page and run a few — stats will appear here.")
        return

    distress = data["distress_count"]
    distress_rate = distress / total
    model_usage: dict = data["model_usage"]
    most_used_key = max(model_usage, key=model_usage.get) if model_usage else ""
    most_used_label = _MODEL_DISPLAY_NAMES.get(most_used_key, most_used_key.upper()) if most_used_key else "—"
    avg_conf = data.get("avg_confidence", 0.0)

    # ── Metric cards ──────────────────────────────────────────────────────────
    st.markdown('<p class="section-title">Overview</p>', unsafe_allow_html=True)
    c1, c2, c3, c4 = st.columns(4)
    c1.markdown(_metric_card("Total Predictions", f"{total:,}"), unsafe_allow_html=True)
    c2.markdown(_metric_card("Distress Rate", f"{distress_rate:.1%}", f"{distress:,} flagged"), unsafe_allow_html=True)
    c3.markdown(_metric_card("Avg Confidence", f"{avg_conf:.1%}"), unsafe_allow_html=True)
    c4.markdown(_metric_card("Most Used Model", most_used_label), unsafe_allow_html=True)

    st.markdown("<br/>", unsafe_allow_html=True)

    # ── Distress split + Risk levels ─────────────────────────────────────────
    col_left, col_right = st.columns(2)

    with col_left:
        st.markdown('<p class="section-title">Distress vs No Distress</p>', unsafe_allow_html=True)
        split_df = pd.DataFrame(
            {
                "category": ["Distress", "No Distress"],
                "count": [distress, total - distress],
            }
        )
        pie = (
            alt.Chart(split_df)
            .mark_arc(innerRadius=70, outerRadius=130)
            .encode(
                theta=alt.Theta("count:Q"),
                color=alt.Color(
                    "category:N",
                    scale=alt.Scale(domain=["Distress", "No Distress"], range=["#e74c3c", "#2ecc71"]),
                    legend=alt.Legend(orient="right", labelColor="#bad7eb", titleColor="#42d8f0"),
                ),
                tooltip=["category:N", "count:Q"],
            )
            .properties(height=300, background=_BG)
            .configure_view(stroke=None)
        )
        st.altair_chart(pie, use_container_width=True)

    with col_right:
        st.markdown('<p class="section-title">Risk Level Distribution</p>', unsafe_allow_html=True)
        risk_data = data["risk_level_counts"]
        risk_df = pd.DataFrame([{"Risk Level": lvl.capitalize(), "count": risk_data.get(lvl, 0)} for lvl in ["low", "medium", "high"]])
        risk_chart = (
            alt.Chart(risk_df)
            .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4)
            .encode(
                x=alt.X(
                    "Risk Level:N",
                    sort=["Low", "Medium", "High"],
                    axis=alt.Axis(labelAngle=0, **{k: v for k, v in _AXIS.items() if k != "gridColor"}),
                ),
                y=alt.Y("count:Q", title="Predictions", axis=alt.Axis(**_AXIS)),
                color=alt.Color(
                    "Risk Level:N",
                    scale=alt.Scale(domain=["Low", "Medium", "High"], range=["#2ecc71", "#f39c12", "#e74c3c"]),
                    legend=None,
                ),
                tooltip=["Risk Level:N", "count:Q"],
            )
            .properties(height=300, background=_BG)
            .configure_view(stroke=None)
        )
        st.altair_chart(risk_chart, use_container_width=True)

    # ── Model usage + Distress by model ──────────────────────────────────────
    st.markdown("<br/>", unsafe_allow_html=True)
    col_ml, col_mr = st.columns(2)

    with col_ml:
        st.markdown('<p class="section-title">Model Usage</p>', unsafe_allow_html=True)
        model_df = pd.DataFrame(
            [{"Model": _MODEL_DISPLAY_NAMES.get(k, k.upper()), "count": v} for k, v in sorted(model_usage.items(), key=lambda x: -x[1])]
        )
        model_chart = (
            alt.Chart(model_df)
            .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color=_MODEL_COLOR)
            .encode(
                x=alt.X("Model:N", sort="-y", axis=alt.Axis(labelAngle=0, **{k: v for k, v in _AXIS.items() if k != "gridColor"})),
                y=alt.Y("count:Q", title="Predictions", axis=alt.Axis(**_AXIS)),
                tooltip=["Model:N", "count:Q"],
            )
            .properties(height=240, background=_BG)
            .configure_view(stroke=None)
        )
        st.altair_chart(model_chart, use_container_width=True)

    with col_mr:
        st.markdown('<p class="section-title">Distress Flags by Model</p>', unsafe_allow_html=True)
        distress_model: dict = data.get("distress_by_model", {})
        if distress_model:
            dm_df = pd.DataFrame(
                [{"Model": _MODEL_DISPLAY_NAMES.get(k, k.upper()), "Distress": v} for k, v in sorted(distress_model.items(), key=lambda x: -x[1])]
            )
            dm_chart = (
                alt.Chart(dm_df)
                .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color="#e74c3c")
                .encode(
                    x=alt.X("Model:N", sort="-y", axis=alt.Axis(labelAngle=0, **{k: v for k, v in _AXIS.items() if k != "gridColor"})),
                    y=alt.Y("Distress:Q", title="Distress Flags", axis=alt.Axis(**_AXIS)),
                    tooltip=["Model:N", "Distress:Q"],
                )
                .properties(height=240, background=_BG)
                .configure_view(stroke=None)
            )
            st.altair_chart(dm_chart, use_container_width=True)
        else:
            st.caption("No distress predictions yet.")

    # ── 7-day trend ───────────────────────────────────────────────────────────
    trend_data = data["predictions_by_day"]
    if trend_data:
        st.markdown("<br/>", unsafe_allow_html=True)
        st.markdown('<p class="section-title">Predictions — last 7 days</p>', unsafe_allow_html=True)
        trend_df = pd.DataFrame(trend_data)
        trend_df["date"] = pd.to_datetime(trend_df["date"])
        now = datetime.now(timezone.utc)
        x_domain = [
            (now - timedelta(days=7)).isoformat(),
            now.isoformat(),
        ]
        trend_chart = (
            alt.Chart(trend_df)
            .mark_area(
                line={"color": _MODEL_COLOR, "strokeWidth": 2},
                color=alt.Gradient(
                    gradient="linear",
                    stops=[
                        alt.GradientStop(color="rgba(14,199,230,0.35)", offset=0),
                        alt.GradientStop(color="rgba(14,199,230,0.0)", offset=1),
                    ],
                    x1=1,
                    x2=1,
                    y1=1,
                    y2=0,
                ),
            )
            .encode(
                x=alt.X(
                    "date:T",
                    title="Date",
                    axis=alt.Axis(format="%b %d", tickCount=7, **_AXIS),
                    scale=alt.Scale(domain=x_domain),
                ),
                y=alt.Y("count:Q", title="Predictions", axis=alt.Axis(**_AXIS)),
                tooltip=[alt.Tooltip("date:T", format="%b %d"), "count:Q"],
            )
            .properties(height=220, background=_BG)
            .configure_view(stroke=None)
        )
        st.altair_chart(trend_chart, use_container_width=True)

    # ── Model health / drift check ────────────────────────────────────────────
    if drift is not None:
        st.markdown("<br/>", unsafe_allow_html=True)
        st.markdown('<p class="section-title">Model Health</p>', unsafe_allow_html=True)

        drift_detected: bool = drift.get("drift_detected", False)
        badge_color = "#e74c3c" if drift_detected else "#2ecc71"
        badge_text = "Drift Detected" if drift_detected else "No Drift"
        threshold_pct = drift.get("drift_threshold", 0.05) * 100
        st.markdown(
            f"""
            <div style="display:inline-block;background:{badge_color};color:#ffffff;
                        font-weight:700;font-size:0.9rem;border-radius:999px;
                        padding:0.35rem 1rem;margin-bottom:1rem;">
                {badge_text}
            </div>
            <span style="color:#7fa8c4;font-size:0.8rem;margin-left:0.75rem;">
                Flags when |7-day confidence − all-time baseline| &gt; {threshold_pct:.0f}%
            </span>
            """,
            unsafe_allow_html=True,
        )

        baseline_conf = drift.get("baseline_confidence", 0.0)
        recent_conf = drift.get("recent_confidence", 0.0)
        delta = drift.get("confidence_delta", 0.0)
        baseline_distress = drift.get("baseline_distress_rate", 0.0)
        recent_distress = drift.get("recent_distress_rate", 0.0)
        recent_count = drift.get("recent_predictions_count", 0)

        d1, d2, d3, d4 = st.columns(4)
        d1.markdown(_metric_card("Baseline Confidence", f"{baseline_conf:.1%}", "all-time avg"), unsafe_allow_html=True)
        d2.markdown(_metric_card("Recent Confidence", f"{recent_conf:.1%}", "last 7 days"), unsafe_allow_html=True)
        delta_sign = "+" if delta >= 0 else ""
        d3.markdown(_metric_card("Confidence Delta", f"{delta_sign}{delta:.1%}", "recent − baseline"), unsafe_allow_html=True)
        d4.markdown(_metric_card("Recent Predictions", f"{recent_count:,}", "last 7 days"), unsafe_allow_html=True)

        st.markdown("<br/>", unsafe_allow_html=True)
        col_dr, col_mc = st.columns(2)

        with col_dr:
            st.markdown('<p class="section-title">Distress Rate — Baseline vs Recent</p>', unsafe_allow_html=True)
            dr_df = pd.DataFrame(
                {
                    "Window": ["All-time Baseline", "Last 7 Days"],
                    "Distress Rate": [baseline_distress, recent_distress],
                }
            )
            dr_chart = (
                alt.Chart(dr_df)
                .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4)
                .encode(
                    x=alt.X("Window:N", axis=alt.Axis(labelAngle=0, **{k: v for k, v in _AXIS.items() if k != "gridColor"})),
                    y=alt.Y("Distress Rate:Q", axis=alt.Axis(format="%", **_AXIS), scale=alt.Scale(domain=[0, 1])),
                    color=alt.Color(
                        "Window:N",
                        scale=alt.Scale(domain=["All-time Baseline", "Last 7 Days"], range=["#0ec7e6", "#e74c3c"]),
                        legend=None,
                    ),
                    tooltip=[alt.Tooltip("Window:N"), alt.Tooltip("Distress Rate:Q", format=".1%")],
                )
                .properties(height=260, background=_BG)
                .configure_view(stroke=None)
            )
            st.altair_chart(dr_chart, use_container_width=True)

        with col_mc:
            model_conf_7d: dict = drift.get("model_confidence_7d", {})
            if model_conf_7d:
                st.markdown('<p class="section-title">Per-Model Confidence — Last 7 Days</p>', unsafe_allow_html=True)
                mc_df = pd.DataFrame(
                    [
                        {"Model": _MODEL_DISPLAY_NAMES.get(k, k.upper()), "Confidence": v}
                        for k, v in sorted(model_conf_7d.items(), key=lambda x: -x[1])
                    ]
                )
                mc_chart = (
                    alt.Chart(mc_df)
                    .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color=_MODEL_COLOR)
                    .encode(
                        x=alt.X("Model:N", sort="-y", axis=alt.Axis(labelAngle=0, **{k: v for k, v in _AXIS.items() if k != "gridColor"})),
                        y=alt.Y("Confidence:Q", axis=alt.Axis(format="%", **_AXIS), scale=alt.Scale(domain=[0, 1])),
                        tooltip=[alt.Tooltip("Model:N"), alt.Tooltip("Confidence:Q", format=".1%")],
                    )
                    .properties(height=260, background=_BG)
                    .configure_view(stroke=None)
                )
                st.altair_chart(mc_chart, use_container_width=True)
            else:
                st.caption("No per-model confidence data for the last 7 days.")
