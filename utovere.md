---
layout: default
title: Utøvere
description: Profiler og tider for alle som har stilt i Kløvstien Open.
permalink: /utovere/
---

<article class="prose">
  <p class="badge kicker">Chrono</p>
  <h1>Utøvere</h1>
  <p class="lede">Alle som har en tid i resultatlista gjennom tidene. Trykk på et navn og se prestasjonene og utviklingen deres over tid.</p>

  <ul class="year-list utover-list">
    {% assign liste = site.data.utovere %}
    {% for person in liste %}
      <li>
        <a href="{{ '/utovere/' | append: person.slug | append: '/' | relative_url }}">
          {{ person.navn }}
          <span class="stat-note">
            —
            {% if person.starter == 1 %}1 start{% else %}{{ person.starter }} starter{% endif %}{% if person.pers_tid %} · pers {{ person.pers_tid }}{% endif %}
          </span>
        </a>
      </li>
    {% endfor %}
  </ul>
</article>
