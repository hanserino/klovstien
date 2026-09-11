# Kløvstien Open

Nettsted for den årlige time trialen Kløvstien Open — fra Åndalsnes sentrum til Trollstigplatået.

## Lokalt

```bash
bundle install
bundle exec jekyll serve
```

Siden kjører på [http://127.0.0.1:4000](http://127.0.0.1:4000).

## GitHub Pages

Repoet er satt opp for GitHub Pages med Jekyll og custom domain `klovstien.no` (`CNAME`-filen ligger i rota).

1. Push til `main`.
2. I repoet: Settings → Pages → Source: GitHub Actions.
3. Hos domeneregistratoren: pek `klovstien.no` til GitHub Pages (A-records for apex, eller ALIAS/ANAME om registrar støtter det).

## Resultater

Fyll inn tider i `_data/resultater.yml`. Påmelding og tidtaking skjer hos [Fjelldatabasen](https://www.fjelldatabasen.no/).

Arkivfotografiene er fra Nasjonalbiblioteket (public domain).
