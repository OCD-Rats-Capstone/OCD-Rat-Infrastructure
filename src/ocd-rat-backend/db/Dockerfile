FROM postgres:18

# Copy initialization scripts and dumps
COPY schema.dump /docker-entrypoint-initdb.d/
COPY data.dump /docker-entrypoint-initdb.d/
COPY restore.sh /docker-entrypoint-initdb.d/

# Ensure script is executable
RUN chmod +x /docker-entrypoint-initdb.d/restore.sh
