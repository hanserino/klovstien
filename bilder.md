---
layout: default
title: Bilder
description: Bilder fra Kløvstien Open, og fra Isterdalen og den gamle kløvvegen utenom løpet.
permalink: /bilder/
gallery: true
---

<article>
  <div class="prose">
    <p class="badge kicker">Galleri</p>
    <h1>Bilder</h1>
    <p class="lede">Trykk på et bilde for å se det i fullskjerm.</p>
  </div>

  <ol class="timeline photo-timeline">
    {% for utgave in site.data.bilder.lop %}
      <li>
        <p class="timeline-year">{{ utgave.year }}</p>
        <span class="timeline-mark" aria-hidden="true"></span>
        <div class="photo-year">
          {% if utgave.bilder and utgave.bilder.size > 0 %}
            {% include galleri.html items=utgave.bilder gallery_id=utgave.year %}
          {% else %}
            <p class="empty-results">{{ utgave.note }}</p>
          {% endif %}
        </div>
      </li>
    {% endfor %}
  </ol>

  <section class="sted-gallery" aria-labelledby="sted-tittel">
    <div class="prose">
      <h2 id="sted-tittel">Isterdalen og Kløvstien</h2>
      <p>Landskap og arkiv fra stien, dalen og platået — uten startnummer og klokke.</p>
    </div>
    {% include galleri.html items=site.data.bilder.sted gallery_id="sted" modifier="gallery-grid--arkiv" eager=true %}
    <p class="sources">Arkivfotografiene er hentet fra Nasjonalbibliotekets bildesamling via Wikimedia Commons, og er i public domain.</p>
  </section>
</article>
