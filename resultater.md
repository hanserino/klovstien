---
layout: default
title: Resultater
description: Resultater fra terrengløpet Kløvstien Open. Kristian Skjeflo Unhjem har løyperekorden på 1:22:18 fra 2026.
permalink: /resultater/
---

<article class="prose">
  <p class="badge kicker">Palmarès</p>
  <h1>Resultater</h1>
  <p class="lede">Kløvstien Open har blitt arrangert i 2024, 2025 og 2026.</p>

  <ul class="year-list">
    {% for year in site.race.years %}
      {% assign data = site.data.resultater[year] %}
      <li>
        <a href="{{ '/resultater/' | append: year | append: '/' | relative_url }}">
          {{ year }}
          {% if data.status == 'kommende' %}
            <span class="stat-note"> — {{ site.race.date_display }}</span>
          {% elsif data.entries and data.entries.size > 0 %}
            {% assign winner = data.entries | where: "plass", 1 | first %}
            {% if winner %}
              <span class="stat-note"> — {{ winner.navn }}, {{ winner.tid }}</span>
            {% endif %}
          {% endif %}
        </a>
      </li>
    {% endfor %}
  </ul>
</article>
