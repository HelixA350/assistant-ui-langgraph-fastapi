FROM python:3.12-slim

RUN pip install poetry==1.6.1
RUN poetry config virtualenvs.create false

WORKDIR /code

COPY ./pyproject.toml ./
RUN poetry lock --no-interaction
RUN poetry install --no-interaction --no-ansi --no-root
RUN pip install assistant-stream==0.0.5

COPY ./app ./app
RUN poetry install --no-interaction --no-ansi
RUN pip install assistant-stream==0.0.5

EXPOSE 8000

CMD exec uvicorn app.server:app --host 0.0.0.0 --port 8000
