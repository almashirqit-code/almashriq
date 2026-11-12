// Countries we ship to, grouped by region (same list as the old almashriqtradingjapan.com site).
const REGIONS: { name: string; countries: [string, string][] }[] = [
  { name: "Europe", countries: [["ru", "Russia"], ["gb", "England"], ["cy", "Cyprus"], ["ge", "Georgia"], ["ua", "Ukraine"], ["tr", "Turkey"], ["de", "Germany"], ["nl", "Netherlands"], ["ie", "Ireland"]] },
  { name: "Caribbean", countries: [["jm", "Jamaica"], ["gy", "Guyana"], ["bs", "Bahamas"], ["tt", "Trinidad"], ["bb", "Barbados"], ["ag", "Antigua"], ["lc", "St Lucia"], ["gd", "Grenada"], ["kn", "St Kitts"], ["vc", "St Vincent"], ["ai", "Anguilla"], ["aw", "Aruba"], ["ky", "Cayman"], ["dm", "Dominica"], ["mf", "St Martin"], ["sr", "Suriname"]] },
  { name: "Africa", countries: [["tz", "Tanzania"], ["ke", "Kenya"], ["za", "S. Africa"], ["ug", "Uganda"], ["ng", "Nigeria"], ["zm", "Zambia"], ["mz", "Mozambique"], ["cd", "Congo"], ["gh", "Ghana"], ["zw", "Zimbabwe"], ["mu", "Mauritius"], ["bw", "Botswana"], ["bi", "Burundi"], ["mw", "Malawi"], ["na", "Namibia"], ["ls", "Lesotho"], ["cm", "Cameroon"], ["ss", "S. Sudan"], ["so", "Somalia"], ["rw", "Rwanda"], ["ao", "Angola"]] },
  { name: "Asia", countries: [["ae", "UAE"], ["mn", "Mongolia"], ["th", "Thailand"], ["my", "Malaysia"], ["pk", "Pakistan"], ["ph", "Philippines"], ["am", "Armenia"], ["az", "Azerbaijan"], ["kg", "Kyrgyzstan"], ["bd", "Bangladesh"], ["lk", "Sri Lanka"], ["id", "Indonesia"], ["mm", "Myanmar"], ["vn", "Vietnam"], ["af", "Afghanistan"], ["kz", "Kazakhstan"]] },
  { name: "America", countries: [["us", "USA"], ["ca", "Canada"], ["cl", "Chile"], ["py", "Paraguay"], ["gt", "Guatemala"], ["cr", "Costa Rica"]] },
  { name: "Oceania", countries: [["nz", "New Zealand"], ["au", "Australia"], ["fj", "Fiji"], ["pg", "P.N. Guinea"], ["fm", "Micronesia"], ["ws", "Samoa"], ["to", "Tonga"]] },
];

export function DestinationFlags() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-6">
      <div className="glass-lite relative overflow-hidden rounded-2xl p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--red)] via-white/70 to-[var(--red)]" />
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
          We ship to
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REGIONS.map((r) => (
            <div key={r.name}>
              <h3 className="mb-2 border-b border-white/10 pb-1 text-sm font-extrabold uppercase tracking-wide text-[var(--accent)]">
                {r.name}
              </h3>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {r.countries.map(([code, name]) => (
                  <li key={code} className="flex items-center gap-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://flagcdn.com/w40/${code}.png`} alt="" width={20} height={15} loading="lazy" className="h-[15px] w-5 rounded-[2px] object-cover ring-1 ring-black/10" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
