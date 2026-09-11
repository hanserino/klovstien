---
layout: default
title: Resultater
description: Resultatlister for Kløvstien Open. Kilian Jornet har løyperekorden på 1:26 fra 2024. Hans Kristian Smedsrød Engdahl vant i 2025.
permalink: /resultater/
---

<article class="prose">
  <p class="badge kicker">Palmarès</p>
  <h1>Resultater</h1>
  <p class="lede">Kløvstien Open har gått i 2024, 2025 og 2026.</p>

  <ul class="year-list">
    {% for year in site.race.years %}
      {% assign data = site.data.resultater[year] %}
      <li>
        <a href="{{ '/resultater/' | append: year | append: '/' | relative_url }}">{{ year }}</a>
        {% if data.status == 'kommende' %}
          <span class="stat-note"> — {{ site.race.date_display }}</span>
        {% elsif data.entries and data.entries.size > 0 %}
          {% assign winner = data.entries | where: "plass", 1 | first %}
          {% if winner %}
            <span class="stat-note"> — {{ winner.navn }}, {{ winner.tid }}</span>
          {% endif %}
        {% endif %}
      </li>
    {% endfor %}
  </ul>
</article>
