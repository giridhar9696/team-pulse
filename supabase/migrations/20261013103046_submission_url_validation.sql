begin;
create function private.valid_submission_url(value text) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare parts text[]; authority text; host text; port text; label text; labels text[];
begin
  if value is null or length(value)>2048 or value ~ '[[:space:]<>"\\]' then return false; end if;
  parts:=regexp_match(value,'^https?://([^/?#]+)([/?#].*)?$','i');
  if parts is null then return false; end if;
  authority:=parts[1];
  if left(authority,1)='[' then
    parts:=regexp_match(authority,'^\[([0-9a-fA-F:]+)\](:([0-9]{1,5}))?$');
    if parts is null or family(parts[1]::inet)<>6 then return false; end if;
    port:=parts[3];
  else
    parts:=regexp_match(authority,'^([A-Za-z0-9.-]+)(:([0-9]{1,5}))?$');
    if parts is null then return false; end if;
    host:=lower(regexp_replace(parts[1],'\.$',''));port:=parts[3];
    if length(host) not between 1 and 253 then return false; end if;
    labels:=string_to_array(host,'.');
    foreach label in array labels loop
      if label !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' then return false; end if;
    end loop;
    if labels[array_length(labels,1)] ~ '^([0-9]+|0x[0-9a-f]+)$' then
      if array_length(labels,1)<>4 then return false; end if;
      foreach label in array labels loop
        if label !~ '^(0|[1-9][0-9]{0,2})$' or label::integer>255 then return false; end if;
      end loop;
      if family(host::inet)<>4 then return false; end if;
    end if;
  end if;
  return port is null or port::integer between 0 and 65535;
exception when invalid_text_representation then return false;
end $$;
revoke all on function private.valid_submission_url(text) from public,anon,authenticated;
alter table public.submissions add constraint submissions_valid_http_url check(private.valid_submission_url(url));
commit;
