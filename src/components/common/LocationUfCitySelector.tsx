import React from 'react';
import {
  BRAZIL_STATES,
  CUSTOM_CITY_VALUE,
  getCitiesForState,
} from '../../constants/branding';

interface LocationUfCitySelectorProps {
  stateUf: string;
  city: string;
  onChangeState: (uf: string) => void;
  onChangeCity: (city: string) => void;
  stateFirst?: boolean;
}

export const LocationUfCitySelector: React.FC<LocationUfCitySelectorProps> = ({
  stateUf,
  city,
  onChangeState,
  onChangeCity,
  stateFirst = true,
}) => {
  const citiesForUf = getCitiesForState(stateUf);
  const isCustomCity =
    Boolean(city) &&
    citiesForUf.length > 0 &&
    !citiesForUf.some((c) => c.toLowerCase() === city.trim().toLowerCase());

  const handleStateChange = (newUf: string) => {
    onChangeState(newUf);
    const nextCities = getCitiesForState(newUf);
    if (nextCities.length > 0) {
      onChangeCity(nextCities[0]);
    } else {
      onChangeCity('');
    }
  };

  const stateField = (
    <div>
      <label className="block font-semibold text-slate-700 mb-1.5">
        Estado (UF) *
      </label>
      <select
        value={stateUf}
        required
        onChange={(e) => handleStateChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 text-xs"
      >
        <option value="" disabled>
          Selecione o estado...
        </option>
        {BRAZIL_STATES.map((st) => (
          <option key={st.uf} value={st.uf}>
            {st.uf} — {st.name}
          </option>
        ))}
      </select>
    </div>
  );

  const cityField = (
    <div className="space-y-2">
      <label className="block font-semibold text-slate-700 mb-1.5">
        Cidade *
      </label>
      {citiesForUf.length > 0 ? (
        <>
          <select
            value={isCustomCity ? CUSTOM_CITY_VALUE : city}
            required
            onChange={(e) => {
              const val = e.target.value;
              if (val === CUSTOM_CITY_VALUE) {
                onChangeCity('');
              } else {
                onChangeCity(val);
              }
            }}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 text-xs"
          >
            {citiesForUf.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
            <option value={CUSTOM_CITY_VALUE}>
              Outra cidade (digitar nome)...
            </option>
          </select>

          {(isCustomCity || city === '') && (
            <input
              type="text"
              required
              value={city}
              onChange={(e) => onChangeCity(e.target.value)}
              placeholder="Digite o nome do município"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 text-xs"
            />
          )}
        </>
      ) : (
        <input
          type="text"
          required
          value={city}
          onChange={(e) => onChangeCity(e.target.value)}
          placeholder="Selecione um estado primeiro ou digite a cidade"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 text-xs"
        />
      )}
    </div>
  );

  return stateFirst ? (
    <>
      {stateField}
      {cityField}
    </>
  ) : (
    <>
      {cityField}
      {stateField}
    </>
  );
};
