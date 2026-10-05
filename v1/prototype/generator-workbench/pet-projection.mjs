const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// A lossless transport encoding, never an alternative source of phenotype facts.
export function internPetSources(value) {
  const locusIds = [];
  const groups = [];
  function visit(item, key = null) {
    if (["sources", "prerequisites"].includes(key) && Array.isArray(item)) {
      if (!item.every((id) => typeof id === "string"))
        throw new Error("Source IDs must be strings.");
      const indices = item.map((id) => {
        if (!locusIds.includes(id)) locusIds.push(id);
        return locusIds.indexOf(id);
      });
      let index = groups.findIndex(
        (group) => JSON.stringify(group) === JSON.stringify(indices),
      );
      if (index < 0) {
        index = groups.length;
        groups.push(indices);
      }
      return { $locusGroup: index };
    }
    if (Array.isArray(item)) return item.map((entry) => visit(entry));
    if (record(item))
      return Object.fromEntries(
        Object.entries(item).map(([name, entry]) => [name, visit(entry, name)]),
      );
    return item;
  }
  return {
    encoding: "pet-source-groups/1",
    locusIds,
    groups,
    body: visit(value),
  };
}

export function expandPetSources(envelope) {
  if (
    !record(envelope) ||
    envelope.encoding !== "pet-source-groups/1" ||
    !Array.isArray(envelope.locusIds) ||
    !envelope.locusIds.every((id) => typeof id === "string") ||
    new Set(envelope.locusIds).size !== envelope.locusIds.length ||
    !Array.isArray(envelope.groups)
  )
    throw new Error("Invalid source dictionary.");
  const seen = new Set();
  for (const group of envelope.groups) {
    if (
      !Array.isArray(group) ||
      !group.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < envelope.locusIds.length,
      )
    )
      throw new Error("Dangling source dictionary index.");
    const key = JSON.stringify(group);
    if (seen.has(key)) throw new Error("Duplicate source group.");
    seen.add(key);
  }
  function visit(item, key = null) {
    if (["sources", "prerequisites"].includes(key)) {
      if (
        !record(item) ||
        Object.keys(item).length !== 1 ||
        !Number.isInteger(item.$locusGroup) ||
        item.$locusGroup < 0 ||
        item.$locusGroup >= envelope.groups.length
      )
        throw new Error("Dangling or malformed source-group reference.");
      return envelope.groups[item.$locusGroup].map(
        (index) => envelope.locusIds[index],
      );
    }
    if (Array.isArray(item)) return item.map((entry) => visit(entry));
    if (record(item))
      return Object.fromEntries(
        Object.entries(item).map(([name, entry]) => [name, visit(entry, name)]),
      );
    return item;
  }
  return visit(envelope.body);
}

export function internElementCoordinates(elements) {
  const coordinateValues = [];
  const visit = (value) => {
    if (typeof value === "number") {
      if (!coordinateValues.includes(value)) coordinateValues.push(value);
      return coordinateValues.indexOf(value);
    }
    if (Array.isArray(value)) return value.map(visit);
    if (record(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, visit(item)]),
      );
    throw new Error(
      "Material geometry requires finite numeric arrays/records.",
    );
  };
  return {
    encoding: "coordinate-index/1",
    coordinateValues,
    geometries: elements.map((element) => visit(element.geometry)),
  };
}
export function expandElementCoordinates(envelope) {
  if (
    envelope?.encoding !== "coordinate-index/1" ||
    !Array.isArray(envelope.coordinateValues) ||
    !envelope.coordinateValues.every(Number.isFinite) ||
    new Set(envelope.coordinateValues).size !==
      envelope.coordinateValues.length ||
    !Array.isArray(envelope.geometries)
  )
    throw new Error("Invalid coordinate dictionary.");
  const visit = (value) => {
    if (
      Number.isInteger(value) &&
      value >= 0 &&
      value < envelope.coordinateValues.length
    )
      return envelope.coordinateValues[value];
    if (Array.isArray(value)) return value.map(visit);
    if (record(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, visit(item)]),
      );
    throw new Error("Dangling coordinate reference.");
  };
  return envelope.geometries.map(visit);
}
