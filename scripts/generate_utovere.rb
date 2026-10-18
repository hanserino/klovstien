#!/usr/bin/env ruby
# frozen_string_literal: true

# Bygger utøversider og oppslagsdata fra _data/resultater.yml.
# Kjøres fra repo-roten: ruby scripts/generate_utovere.rb

require "fileutils"
require "yaml"

ROOT = File.expand_path("..", __dir__)
RESULTS_PATH = File.join(ROOT, "_data", "resultater.yml")
ALIAS_PATH = File.join(ROOT, "_data", "utover-alias.yml")
UTOVERE_PATH = File.join(ROOT, "_data", "utovere.yml")
SLUGS_PATH = File.join(ROOT, "_data", "utover_slugs.yml")
PAGES_DIR = File.join(ROOT, "utovere")

def load_yaml(path)
  return [] unless File.exist?(path)

  YAML.safe_load(File.read(path), permitted_classes: [], aliases: false) || []
end

def slugify(name)
  name.to_s.downcase
      .gsub("æ", "ae")
      .gsub("ø", "o")
      .gsub("å", "a")
      .gsub(/[^a-z0-9]+/, "-")
      .gsub(/\A-+|-+\z/, "")
end

def parse_seconds(tid)
  return nil unless tid.is_a?(String)
  return nil if tid.match?(/DNF|Ukjent|Uvisst/i)

  parts = tid.split(":").map { |part| Integer(part, 10) }
  case parts.size
  when 3
    parts[0] * 3600 + parts[1] * 60 + parts[2]
  when 2
    if parts[0] >= 3
      parts[0] * 60 + parts[1]
    else
      parts[0] * 3600 + parts[1] * 60
    end
  end
rescue ArgumentError
  nil
end

def format_hms(seconds)
  seconds = seconds.round
  sign = seconds.negative? ? "−" : ""
  seconds = seconds.abs
  h = seconds / 3600
  m = (seconds % 3600) / 60
  s = seconds % 60
  if h.positive?
    format("%s%d:%02d:%02d", sign, h, m, s)
  else
    format("%s%d:%02d", sign, m, s)
  end
end

def norwegian_sort_key(name)
  name.to_s.downcase.tr("æøå", "|}~")
end

def compact_hash(hash)
  hash.reject { |_key, value| value.nil? || value == "" || value == [] }
end

def each_result(results)
  results.each do |year, data|
    next unless data.is_a?(Hash)
    next if data["status"] == "kommende"

    if data["disipliner"].is_a?(Array)
      data["disipliner"].each do |disiplin|
        next unless disiplin.is_a?(Hash)

        Array(disiplin["entries"]).each do |entry|
          yield year, disiplin, entry
        end
      end
    else
      Array(data["entries"]).each do |entry|
        yield year, { "id" => "loping", "tittel" => "Løping" }, entry
      end
    end
  end
end

results = load_yaml(RESULTS_PATH)
raise "Fant ikke resultater i #{RESULTS_PATH}" unless results.is_a?(Hash)

aliases = load_yaml(ALIAS_PATH)
alias_to_canonical = {}
Array(aliases).each do |row|
  canonical = row["navn"]
  next if canonical.to_s.empty?

  alias_to_canonical[canonical] = canonical
  Array(row["ogsa"]).each { |name| alias_to_canonical[name] = canonical }
end

people = Hash.new { |hash, navn| hash[navn] = { "navn" => navn, "aliases" => [navn], "results" => [] } }
years = []

each_result(results) do |year, disiplin, entry|
  navn = entry && entry["navn"]
  next if navn.to_s.empty?

  canonical = alias_to_canonical[navn] || navn
  person = people[canonical]
  person["aliases"] << navn unless person["aliases"].include?(navn)

  year_i = Integer(year)
  years << year_i
  seconds = parse_seconds(entry["tid"])
  person["results"] << compact_hash(
    "year" => year_i,
    "disiplin_id" => disiplin["id"] || "loping",
    "disiplin" => disiplin["tittel"] || "Løping",
    "plass" => entry["plass"],
    "tid" => entry["tid"],
    "seconds" => seconds,
    "merknad" => entry["merknad"],
    "rekord" => entry["rekord"],
    "note" => disiplin["note"]
  )
end

alias_to_canonical.each do |name, canonical|
  next unless people.key?(canonical)

  people[canonical]["aliases"] << name unless people[canonical]["aliases"].include?(name)
end

years = years.uniq.sort
people.each_value do |person|
  person["aliases"] = person["aliases"].uniq
  person["results"].sort_by! { |row| [row["year"], row["disiplin_id"]] }
  person["slug"] = slugify(person["navn"])
  person["starter"] = person["results"].size
  person["akse_aar"] = years.dup

  plottable = person["results"].select { |row| row["seconds"] }
  running = plottable.select { |row| row["disiplin_id"] == "loping" }
  pool = running.any? ? running : plottable
  best = pool.min_by { |row| row["seconds"] }
  if best
    person["pers_tid"] = best["tid"]
    person["pers_year"] = best["year"]
    person["pers_disiplin"] = best["disiplin"]
  end

  same = pool.select { |row| row["disiplin_id"] == (best && best["disiplin_id"]) }
             .sort_by { |row| row["year"] }
  if same.size >= 2
    previous = same[-2]
    latest = same[-1]
    delta = latest["seconds"] - previous["seconds"]
    unless delta.zero?
      person["delta_tid"] = format_hms(delta)
      person["delta_year"] = previous["year"]
      person["delta_bedre"] = delta.negative?
    end
  end
end

ordered = people.values.sort_by { |person| norwegian_sort_key(person["navn"]) }
export = ordered.map do |person|
  compact_hash(person.merge("aliases" => (person["aliases"] - [person["navn"]])))
end

File.write(
  UTOVERE_PATH,
  YAML.dump(export).sub(/\A---\n/, "")
)

slugs = {}
ordered.each do |person|
  person["aliases"].each { |name| slugs[name] = person["slug"] }
end
File.write(
  SLUGS_PATH,
  YAML.dump(slugs).sub(/\A---\n/, "")
)

FileUtils.mkdir_p(PAGES_DIR)
Dir.glob(File.join(PAGES_DIR, "*.md")).each { |path| File.delete(path) }

ordered.each do |person|
  slug = person["slug"]
  navn = person["navn"]
  pers = person["pers_tid"]
  description = if pers
                  "Resultater for #{navn} i Kløvstien Open. Pers: #{pers}."
                else
                  "Resultater for #{navn} i Kløvstien Open."
                end

  File.write(
    File.join(PAGES_DIR, "#{slug}.md"),
    <<~MARKDOWN
      ---
      layout: default
      title: #{navn}
      description: "#{description}"
      permalink: /utovere/#{slug}/
      slug: #{slug}
      utover: true
      body_class: utover
      ---
      {% include utover-profil.html %}
    MARKDOWN
  )
end

warn "Skrev #{ordered.size} utøversider."
